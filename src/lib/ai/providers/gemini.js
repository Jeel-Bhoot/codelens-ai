import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/ai/prompt';
import { resolveGeminiModel } from '@/lib/ai/providers/models';

/**
 * Google Gemini, via the REST streaming endpoint.
 *
 * Why this provider exists: Anthropic has no free tier, and this project has
 * to be runnable — with a real model, not the local engine — by someone who
 * cannot spend money. Gemini's free tier needs a Google account and no card.
 *
 * Called with plain `fetch` rather than an SDK: it is one POST and a read
 * loop, and the NDJSON contract is carried by the prompt, so nothing else in
 * the pipeline changes when the provider does.
 *
 * Three details that are easy to get wrong, and each of which silently breaks
 * streaming rather than erroring:
 *
 *  1. `?alt=sse` is mandatory. Without it the response is a single streamed
 *     JSON *array*, with no per-message framing — an SSE reader finds no
 *     `data:` lines and emits nothing.
 *  2. Chunks are full `GenerateContentResponse` objects, not deltas. The
 *     "delta" is that `parts[].text` holds only the new slice.
 *  3. `parts` is an array and Gemini 3.x is a thinking family: a part with
 *     `thought: true` is reasoning, not answer text. Concatenating every part
 *     splices the model's private reasoning into the review output.
 */

/**
 * Overridable so the provider can be pointed at a regional endpoint, a
 * corporate proxy, or a local stand-in that speaks the same wire format —
 * which is how this path gets tested without spending a real quota.
 */
const BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const ENDPOINT = `${BASE_URL}/models`;

/** Effort ladder → Gemini's thinking budget. */
const THINKING_BUDGET = { low: 2048, medium: 8192, high: 16384, xhigh: 24576, max: 32768 };

export async function streamFromGemini({
  apiKey,
  files,
  profile,
  focus,
  notes,
  effort,
  model: requestedModel,
  signal,
  send,
}) {
  // Allowlisted server-side. Every id it can return is free-tier, so this is
  // a correctness gate rather than a spending one.
  const model = resolveGeminiModel(requestedModel);

  send('start', { mode: 'live', provider: 'gemini', model });
  send('status', { phase: 'reasoning' });

  const response = await fetch(`${ENDPOINT}/${model}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      // Header form, not ?key= — query strings leak into proxy logs.
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      // Sibling of `contents`, and a Content object — a bare string is a 400.
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        { role: 'user', parts: [{ text: buildUserPrompt({ files, profile, focus, notes }) }] },
      ],
      generationConfig: {
        maxOutputTokens: 32_000,
        // Low but non-zero: we want consistent structure, not identical prose.
        temperature: 0.3,
        thinkingConfig: {
          thinkingBudget: THINKING_BUDGET[effort] ?? THINKING_BUDGET.high,
          includeThoughts: true,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new GeminiError(response.status, await response.text().catch(() => ''));
  }

  let sawText = false;
  let sawReasoning = false;
  let finishReason = null;
  let usage = null;

  await readSse(response.body, (payload) => {
    let chunk;
    try {
      chunk = JSON.parse(payload);
    } catch {
      // A truncated or non-JSON frame kills one chunk, not the review.
      return;
    }

    const candidate = chunk.candidates?.[0];
    if (candidate?.finishReason) finishReason = candidate.finishReason;
    if (chunk.usageMetadata) usage = chunk.usageMetadata;

    for (const part of candidate?.content?.parts ?? []) {
      if (typeof part.text !== 'string') continue; // functionCall / inlineData

      if (part.thought) {
        sawReasoning = true;
        send('reasoning', { text: part.text });
        continue;
      }

      if (!sawText) {
        sawText = true;
        send('status', { phase: 'reviewing' });
      }
      send('token', { text: part.text });
    }
  });

  if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
    send('error', {
      message: 'Gemini declined this input on safety grounds. Try a different excerpt.',
      recoverable: false,
    });
    return;
  }

  if (finishReason === 'MAX_TOKENS') {
    send('warning', {
      message:
        'The review hit the output limit and was truncated. Split the input into fewer files for full coverage.',
    });
  }

  send('complete', {
    mode: 'live',
    provider: 'gemini',
    model,
    hadReasoning: sawReasoning,
    usage: {
      input: usage?.promptTokenCount ?? 0,
      output: usage?.candidatesTokenCount ?? 0,
      cacheRead: usage?.cachedContentTokenCount ?? 0,
      cacheWrite: 0,
    },
  });
}

/**
 * Minimal SSE reader. Gemini emits `data:` lines only — no `event:` names —
 * with a blank line between messages.
 */
async function readSse(body, onPayload) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let index = buffer.indexOf('\n');
    while (index !== -1) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);

      if (line.startsWith('data:')) {
        const payload = line.slice(5).trim();
        // `[DONE]` is an OpenAI convention Gemini does not document, but
        // skipping it costs nothing and makes this correct either way.
        if (payload && payload !== '[DONE]') onPayload(payload);
      }

      index = buffer.indexOf('\n');
    }
  }
}

export class GeminiError extends Error {
  constructor(status, detail) {
    super(`Gemini request failed with ${status}`);
    this.name = 'GeminiError';
    this.status = status;
    // Kept server-side for the log; never returned to the browser.
    this.detail = detail?.slice(0, 500);
  }
}

export function geminiClientMessage(error) {
  if (!(error instanceof GeminiError)) return null;

  console.error('[review] Gemini error', error.status, error.detail);

  if (error.status === 400) {
    return 'Gemini rejected the request. The model id may be wrong — check GEMINI_MODEL.';
  }
  if (error.status === 401 || error.status === 403) {
    return 'That Gemini key was rejected. Check it in Settings or in .env.local.';
  }
  if (error.status === 429) {
    return 'Gemini free-tier rate limit reached. Wait a minute and try again.';
  }
  if (error.status >= 500) return 'Gemini is having trouble right now. Try again shortly.';
  return `Gemini returned an error (${error.status}).`;
}

export function geminiRecoverable(error) {
  return error instanceof GeminiError && (error.status === 429 || error.status >= 500);
}
