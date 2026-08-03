import { generateDemoReview } from '@/lib/ai/demo-reviewer';
import {
  resolveProvider,
  resolveModel,
  streamFor,
  toClientMessage,
  isRecoverable,
} from '@/lib/ai/providers';
import { reviewRequestSchema } from '@/lib/validation/review-schema';
import { REVIEW_PROFILES } from '@/lib/constants';
import { checkRateLimit, clientKey } from '@/lib/rate-limit';

// Provider SDKs need Node APIs, and streaming must not be buffered.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A thorough review with a thinking budget runs well past Vercel Hobby's 10s
// default, which kills the function mid-stream — the headline feature failing
// only once deployed. Raise it explicitly rather than inheriting the default.
export const maxDuration = 60;

const encoder = new TextEncoder();

/** Serialise one SSE frame. */
function frame(event, data) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  // Tells nginx and friends not to buffer — without it the stream arrives
  // all at once at the end, which looks exactly like a broken feature.
  'X-Accel-Buffering': 'no',
};

function jsonError(message, status, extra = {}) {
  return Response.json({ error: message, ...extra }, { status });
}

export async function POST(request) {
  // --- Rate limit ---------------------------------------------------------
  const limit = checkRateLimit(`review:${clientKey(request)}`, { limit: 12, windowMs: 60_000 });
  if (!limit.allowed) {
    return jsonError('Too many reviews requested. Give it a minute.', 429, {
      retryAfter: limit.retryAfter,
    });
  }

  // --- Parse + validate ---------------------------------------------------
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonError('Request body must be valid JSON.', 400);
  }

  const parsed = reviewRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError('That request did not pass validation.', 400, {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  const { files, profile, focus, notes, apiKey: userKey, model: requestedModel } = parsed.data;

  const provider = resolveProvider(userKey);
  const effort = process.env.ANTHROPIC_EFFORT || REVIEW_PROFILES[profile]?.effort || 'high';

  const abortController = new AbortController();
  request.signal?.addEventListener('abort', () => abortController.abort());

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event, data) => {
        try {
          controller.enqueue(frame(event, data));
        } catch {
          // Client hung up mid-write; nothing useful to do.
        }
      };

      try {
        if (provider.name === 'demo') {
          send('start', { mode: 'demo', provider: 'local', model: null });
          for await (const chunk of generateDemoReview({ files, profile })) {
            if (abortController.signal.aborted) break;
            send(chunk.event, chunk.data);
          }
          controller.close();
          return;
        }

        await streamFor(provider.name)({
          apiKey: provider.apiKey,
          files,
          profile,
          focus,
          notes,
          effort,
          // Already validated against the provider's allowlist — no
          // client-supplied string crosses this boundary.
          model: resolveModel(provider.name, requestedModel),
          signal: abortController.signal,
          send,
        });

        controller.close();
      } catch (error) {
        send('error', {
          message: toClientMessage(error),
          recoverable: isRecoverable(error),
        });
        controller.close();
      }
    },

    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
