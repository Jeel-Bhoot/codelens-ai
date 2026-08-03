import {
  streamFromAnthropic,
  anthropicClientMessage,
  anthropicRecoverable,
} from '@/lib/ai/providers/anthropic';
import {
  streamFromGemini,
  geminiClientMessage,
  geminiRecoverable,
} from '@/lib/ai/providers/gemini';
import { resolveGeminiModel } from '@/lib/ai/providers/models';
import { providerForKey } from '@/lib/ai/providers/detect';

/**
 * Which model actually runs a review.
 *
 * Selection is by whichever key exists, Anthropic first — it is the better
 * reviewer — with Gemini as the free alternative so the app can run against a
 * real model without anyone paying for it. Neither key present means the local
 * engine, which is a working product rather than an error page.
 *
 * A visitor's own key (Settings) always wins over the server's, and is used
 * for that one request only: never stored, never logged, never written to
 * review history.
 */

export { providerForKey } from '@/lib/ai/providers/detect';

export function resolveProvider(userKey) {
  if (process.env.NEXT_PUBLIC_FORCE_DEMO_MODE === 'true') return { name: 'demo' };

  // A key pasted in Settings takes precedence, but only if we can tell which
  // service it belongs to — sending an Anthropic key to Google just 403s.
  const allowByoKey = process.env.NEXT_PUBLIC_ALLOW_BYO_KEY !== 'false';
  if (allowByoKey && userKey) {
    const name = providerForKey(userKey);
    if (name) return { name, apiKey: userKey, byo: true };
  }

  // Free provider first, deliberately. Preferring the paid one meant that an
  // ANTHROPIC_API_KEY merely *present* in the environment — inherited from a
  // template, a shared shell, a copied Vercel project — silently started
  // spending. Key presence is not consent to spend.
  if (process.env.GEMINI_API_KEY) {
    return { name: 'gemini', apiKey: process.env.GEMINI_API_KEY };
  }

  // The paid provider additionally requires an explicit opt-in, so the absence
  // of a variable is the safe state rather than the expensive one.
  if (process.env.ANTHROPIC_API_KEY) {
    if (process.env.ALLOW_PAID_PROVIDER === 'true') {
      return { name: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY };
    }
    console.warn(
      '[review] ANTHROPIC_API_KEY is set but ALLOW_PAID_PROVIDER is not "true" — ' +
        'refusing to spend. Set ALLOW_PAID_PROVIDER=true to enable it.'
    );
  }

  return { name: 'demo' };
}

/**
 * The model that will actually be used, resolved per provider.
 *
 * Resolving here rather than inside each provider means no client-supplied
 * string is ever passed downstream: the Anthropic path currently ignores a
 * `model` argument only because its signature happens not to destructure one,
 * and one careless edit to that signature would turn the guarantee off
 * silently. This makes it structural.
 */
export function resolveModel(providerName, requested) {
  if (providerName === 'gemini') return resolveGeminiModel(requested);
  if (providerName === 'anthropic') return process.env.ANTHROPIC_MODEL || 'claude-opus-5';
  return null;
}

export function streamFor(provider) {
  return provider === 'gemini' ? streamFromGemini : streamFromAnthropic;
}

/** Never leak provider internals or key material to the browser. */
export function toClientMessage(error) {
  if (error?.name === 'AbortError') return 'Review cancelled.';
  return (
    geminiClientMessage(error) ??
    anthropicClientMessage(error) ??
    'Something went wrong while generating the review.'
  );
}

export function isRecoverable(error) {
  return geminiRecoverable(error) || anthropicRecoverable(error);
}

/** Reported by /api/health — capability only, never the key. */
export function describeConfiguration() {
  const provider = resolveProvider(null);
  return {
    mode: provider.name === 'demo' ? 'demo' : 'live',
    provider: provider.name,
    model:
      provider.name === 'anthropic'
        ? process.env.ANTHROPIC_MODEL || 'claude-opus-5'
        : provider.name === 'gemini'
          ? resolveGeminiModel(null)
          : null,
    // Tells the UI whether to offer a model picker at all.
    modelSelectable: provider.name === 'gemini',
  };
}
