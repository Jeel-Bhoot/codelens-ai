import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/ai/prompt';

/**
 * Per-model capability map.
 *
 * The Messages API is NOT uniform across models, and sending an unsupported
 * parameter is a hard 400 rather than a silent ignore. An earlier version of
 * this file sent `output_config.effort` and `thinking: {type:'adaptive'}`
 * unconditionally, which meant setting ANTHROPIC_MODEL=claude-haiku-4-5 —
 * the obvious thing to do to save money — failed every single request.
 *
 * Haiku 4.5 is the odd one out: `effort` errors at *every* level, so the field
 * has to be dropped entirely rather than down-shifted, and its only thinking
 * mode is the older `budget_tokens` form.
 */
const MODELS = {
  'claude-opus-5': {
    effort: true,
    thinking: 'adaptive',
    summarizedThinking: true,
    maxOutput: 128_000,
  },
  'claude-sonnet-5': {
    effort: true,
    thinking: 'adaptive',
    summarizedThinking: true,
    maxOutput: 128_000,
  },
  'claude-haiku-4-5': {
    effort: false,
    thinking: 'budget',
    summarizedThinking: false,
    maxOutput: 64_000,
  },
};

/**
 * Unknown model → send the smallest request that every model accepts. It
 * costs the reasoning panel, but it cannot 400, which is the right trade for
 * a model this code has never been tested against.
 */
const CONSERVATIVE = {
  effort: false,
  thinking: 'none',
  summarizedThinking: false,
  maxOutput: 16_000,
};

function capabilitiesFor(model) {
  if (MODELS[model]) return MODELS[model];
  console.warn(
    `[review] No capability entry for "${model}" — sending a minimal request. ` +
      'Add it to MODELS in providers/anthropic.js to enable effort and thinking.'
  );
  return CONSERVATIVE;
}

/** Build only the parameters this specific model actually accepts. */
function buildRequest({ model, effort, files, profile, focus, notes }) {
  const caps = capabilitiesFor(model);
  const maxTokens = Math.min(32_000, caps.maxOutput);

  const request = {
    model,
    max_tokens: maxTokens,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        // Byte-identical on every request, so this prefix is cached and
        // re-read at roughly a tenth of the input cost.
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: buildUserPrompt({ files, profile, focus, notes }) }],
  };

  if (caps.effort) request.output_config = { effort };

  if (caps.thinking === 'adaptive') {
    request.thinking = caps.summarizedThinking
      ? { type: 'adaptive', display: 'summarized' }
      : { type: 'adaptive' };
  } else if (caps.thinking === 'budget') {
    // budget_tokens must be >= 1024 and strictly less than max_tokens.
    request.thinking = {
      type: 'enabled',
      budget_tokens: Math.max(1024, Math.floor(maxTokens / 4)),
    };
  }

  return request;
}

export async function streamFromAnthropic({
  apiKey,
  files,
  profile,
  focus,
  notes,
  effort,
  signal,
  send,
}) {
  const client = new Anthropic({ apiKey, maxRetries: 1 });
  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-5';

  send('start', { mode: 'live', provider: 'anthropic', model });
  send('status', { phase: 'reasoning' });

  let sawText = false;
  let sawReasoning = false;

  const stream = client.messages.stream(
    buildRequest({ model, effort, files, profile, focus, notes }),
    { signal }
  );

  stream.on('streamEvent', (event) => {
    if (event.type !== 'content_block_delta') return;

    if (event.delta.type === 'thinking_delta') {
      sawReasoning = true;
      send('reasoning', { text: event.delta.thinking });
      return;
    }

    if (event.delta.type === 'text_delta') {
      if (!sawText) {
        sawText = true;
        send('status', { phase: 'reviewing' });
      }
      send('token', { text: event.delta.text });
    }
  });

  const message = await stream.finalMessage();

  // Safety classifiers can decline with HTTP 200 — check before trusting
  // content. Reading content[0] unconditionally is how this breaks in prod.
  if (message.stop_reason === 'refusal') {
    send('error', {
      message:
        message.stop_details?.explanation ||
        'The safety classifier declined this input. Try a smaller or different excerpt.',
      recoverable: false,
    });
    return;
  }

  if (message.stop_reason === 'max_tokens') {
    send('warning', {
      message:
        'The review hit the output limit and was truncated. Split the input into fewer files for full coverage.',
    });
  }

  send('complete', {
    mode: 'live',
    provider: 'anthropic',
    model,
    hadReasoning: sawReasoning,
    usage: {
      input: message.usage?.input_tokens ?? 0,
      output: message.usage?.output_tokens ?? 0,
      cacheRead: message.usage?.cache_read_input_tokens ?? 0,
      cacheWrite: message.usage?.cache_creation_input_tokens ?? 0,
    },
  });
}

/** Never leak provider internals or key material to the browser. */
export function anthropicClientMessage(error) {
  if (error instanceof Anthropic.AuthenticationError) {
    return 'That Anthropic key was rejected. Check it in Settings.';
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return 'This API key does not have access to the configured model.';
  }
  if (error instanceof Anthropic.RateLimitError) {
    return 'Anthropic rate limit reached. Wait a moment and try again.';
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return 'Could not reach the Anthropic API. Check your connection.';
  }
  if (error instanceof Anthropic.APIError) {
    return `The review service returned an error (${error.status ?? 'unknown'}).`;
  }
  return null;
}

export function anthropicRecoverable(error) {
  return (
    error instanceof Anthropic.RateLimitError ||
    error instanceof Anthropic.APIConnectionError ||
    (error instanceof Anthropic.APIError && Number(error.status) >= 500)
  );
}

export { MODELS as ANTHROPIC_MODELS };
