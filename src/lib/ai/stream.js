import { VALID_SEVERITIES, VALID_CATEGORIES } from './prompt';
import { uid } from '../utils';

/**
 * Incremental NDJSON reader.
 *
 * The model streams token-by-token, so a chunk almost never lands on a line
 * boundary. This keeps a rolling buffer, emits every *complete* line as it
 * closes, and holds the partial tail until the next chunk completes it.
 *
 * Usage:
 *   const reader = createNdjsonReader(onRecord);
 *   reader.push(chunk);   // call per chunk
 *   reader.flush();       // call once at end of stream
 */
export function createNdjsonReader(onRecord) {
  let buffer = '';

  const consume = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    // Models occasionally wrap output in a fence despite instructions.
    if (trimmed.startsWith('```') || trimmed === '---') return;
    try {
      const record = JSON.parse(trimmed);
      if (record && typeof record === 'object') onRecord(normalizeRecord(record));
    } catch {
      // A malformed line is not fatal — the next line may be perfectly good.
      // Dropping it is strictly better than aborting the whole review.
    }
  };

  return {
    push(chunk) {
      buffer += chunk;
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        consume(buffer.slice(0, newlineIndex));
        buffer = buffer.slice(newlineIndex + 1);
        newlineIndex = buffer.indexOf('\n');
      }
    },
    flush() {
      if (buffer.trim()) consume(buffer);
      buffer = '';
    },
  };
}

/**
 * Coerce a model record into the shape the UI relies on. The model is
 * well-behaved, but a renderer that trusts unvalidated model output is a
 * renderer that crashes in front of the person you're demoing to.
 */
export function normalizeRecord(record) {
  if (record.type === 'finding') {
    return {
      type: 'finding',
      id: String(record.id || uid('f')),
      severity: VALID_SEVERITIES.has(record.severity) ? record.severity : 'info',
      category: VALID_CATEGORIES.has(record.category) ? record.category : 'maintainability',
      title: String(record.title || 'Untitled finding').slice(0, 160),
      file: String(record.file || ''),
      line: Number.isFinite(Number(record.line)) ? Math.max(1, Number(record.line)) : null,
      endLine: Number.isFinite(Number(record.endLine)) ? Number(record.endLine) : null,
      description: String(record.description || ''),
      impact: String(record.impact || ''),
      suggestion: String(record.suggestion || ''),
      codeBefore: typeof record.codeBefore === 'string' ? record.codeBefore : '',
      codeAfter: typeof record.codeAfter === 'string' ? record.codeAfter : '',
      confidence: ['high', 'medium', 'low'].includes(record.confidence)
        ? record.confidence
        : 'medium',
      source: record.source === 'static' ? 'static' : 'ai',
    };
  }

  if (record.type === 'summary') {
    return {
      type: 'summary',
      overview: String(record.overview || ''),
      strengths: Array.isArray(record.strengths) ? record.strengths.map(String) : [],
      themes: Array.isArray(record.themes) ? record.themes.map(String) : [],
    };
  }

  if (record.type === 'done') {
    return {
      type: 'done',
      verdict: String(record.verdict || ''),
      topPriorities: Array.isArray(record.topPriorities) ? record.topPriorities.map(String) : [],
    };
  }

  return record;
}

/**
 * Read an SSE response body and dispatch typed events.
 *
 * The route handler speaks a tiny SSE dialect (`event:` + `data:` pairs) so the
 * client can distinguish reasoning tokens, review tokens, and errors without
 * inspecting payload shapes.
 */
export async function readSseStream(response, handlers = {}) {
  if (!response.body) throw new Error('Response has no readable body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const dispatch = (eventName, rawData) => {
    if (!rawData) return;
    let payload;
    try {
      payload = JSON.parse(rawData);
    } catch {
      return;
    }
    handlers[eventName]?.(payload);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line.
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        let eventName = 'message';
        const dataLines = [];
        frame.split('\n').forEach((line) => {
          if (line.startsWith('event:')) eventName = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
        });

        dispatch(eventName, dataLines.join('\n'));
        boundary = buffer.indexOf('\n\n');
      }
    }
  } finally {
    reader.releaseLock();
  }
}
