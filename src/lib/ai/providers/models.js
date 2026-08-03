/**
 * Models a visitor is allowed to choose, and the rule about who may choose.
 *
 * Dependency-free on purpose: the Settings form imports this, and anything
 * that reaches for a provider SDK would drag it into the client bundle.
 *
 * THE RULE — model choice follows who pays:
 *
 *   Gemini   → selectable. Every id below is free-tier, so choosing between
 *              them cannot move you onto a more expensive model.
 *
 *              CAVEAT, and it matters: "free tier" is a property of the
 *              BILLING ACCOUNT, not of a model id. If the key's Google Cloud
 *              project has billing enabled, these same ids bill at paid rates
 *              once free limits are passed. Issue the key from a project with
 *              billing switched OFF if you want the guarantee to hold.
 *   Anthropic→ NOT selectable, ever. It is billed per token, so the model is
 *              read from server env only. `resolveModel()` in ./index.js
 *              resolves it before the request reaches a provider, so no
 *              client-supplied string ever crosses that boundary.
 */

/**
 * Confirmed "Free of charge" on Google's pricing page, and stable rather than
 * preview — preview ids in this family are actively retired, so pinning one
 * would break the app on Google's schedule rather than ours.
 */
export const FREE_GEMINI_MODELS = [
  {
    id: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    hint: 'Balanced. The default — reasoning-capable and handles multi-file reviews.',
  },
  {
    id: 'gemini-3.6-flash',
    label: 'Gemini 3.6 Flash',
    hint: 'Newest of the Flash line. Try this if 3.5 misses things.',
  },
  {
    id: 'gemini-3.5-flash-lite',
    label: 'Gemini 3.5 Flash-Lite',
    hint: 'Fastest and lightest on your daily quota. Shallower analysis.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash-Lite',
    hint: 'Lightest option. Best when you are close to your daily limit.',
  },
  // Every id above was confirmed by calling :streamGenerateContent with a
  // newly issued free key. That check is the reason this list is what it is —
  // three plausible candidates failed it, and none of them fail in a way the
  // docs predict:
  //
  //   gemini-2.5-flash       404 "no longer available to new users"
  //   gemini-2.5-flash-lite  404 "no longer available to new users"
  //   gemini-2.5-pro         429 quota exceeded on the first ever request
  //   gemini-2.0-flash       429 quota exceeded on the first ever request
  //
  // The 2.5 pair still appear in ListModels AND are documented "Stable" and
  // "Free of charge" — they are simply closed to accounts created after their
  // sunset. The 429 pair have a free-tier rate limit of zero, so "free" there
  // is a price with no entitlement behind it. Docs and ListModels both lie
  // about this; only a real call tells the truth.
];

export const DEFAULT_GEMINI_MODEL = FREE_GEMINI_MODELS[0].id;

const FREE_IDS = new Set(FREE_GEMINI_MODELS.map((m) => m.id));

/**
 * Resolve the model for a Gemini request.
 *
 * An unrecognised or absent request falls back to configuration rather than
 * erroring — a stale value in someone's localStorage should degrade to the
 * default, not break their review.
 */
export function resolveGeminiModel(requested) {
  if (requested && FREE_IDS.has(requested)) return requested;

  const configured = process.env.GEMINI_MODEL;
  // A self-hoster may deliberately set a paid or newer id in their own env;
  // that is their call, so env is trusted where a request body is not.
  return configured || DEFAULT_GEMINI_MODEL;
}

export function isFreeGeminiModel(id) {
  return FREE_IDS.has(id);
}
