/**
 * In-process sliding-window rate limiter.
 *
 * Deliberately simple: this protects a single instance from one client
 * hammering an endpoint that costs real money per call. It resets on deploy and
 * does not coordinate across instances — a multi-region deployment would swap
 * this for Redis or Vercel KV behind the same `check()` signature.
 */
const buckets = new Map();
const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = Date.now();

function sweep(now, windowMs) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  buckets.forEach((timestamps, key) => {
    const live = timestamps.filter((t) => now - t < windowMs);
    if (live.length) buckets.set(key, live);
    else buckets.delete(key);
  });
}

export function checkRateLimit(key, { limit = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  sweep(now, windowMs);

  const timestamps = (buckets.get(key) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    const retryAfterMs = windowMs - (now - timestamps[0]);
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);

  return { allowed: true, remaining: limit - timestamps.length, retryAfter: 0 };
}

/**
 * Client identity behind a proxy.
 *
 * The leftmost X-Forwarded-For entry is whatever the *client* sent — proxies
 * append, they do not replace — so keying a rate limit on it lets anyone mint
 * a fresh bucket per request with one header. That makes the only cost bound
 * in the system trivially bypassable.
 *
 * Platform-verified headers are preferred; otherwise take the entry
 * TRUSTED_PROXY_HOPS from the RIGHT, which is the last hop our own
 * infrastructure wrote and the client cannot forge.
 */
export function clientKey(request) {
  // Written by the edge and not forwardable by a client.
  const verified =
    request.headers.get('x-vercel-forwarded-for') || request.headers.get('cf-connecting-ip');
  if (verified) return truncate(verified.trim());

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const hops = forwarded
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean);
    const trusted = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS ?? 1));
    // e.g. one trusted hop → the last entry, which that hop wrote itself.
    return truncate(hops[Math.max(0, hops.length - trusted)] ?? 'anonymous');
  }

  return truncate(request.headers.get('x-real-ip') || 'anonymous');
}

/** Keys are attacker-influenced, so never store one verbatim or unbounded. */
function truncate(value) {
  return value.slice(0, 45);
}
