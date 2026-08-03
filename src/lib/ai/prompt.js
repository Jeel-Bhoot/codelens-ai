import { CATEGORY_KEYS, SEVERITY_ORDER, REVIEW_PROFILES } from '../constants';

/**
 * The reviewer persona.
 *
 * Two things this prompt does deliberately:
 *
 * 1. It asks for NDJSON (one JSON object per line) rather than a single JSON
 *    document. A single document can only be parsed once it is complete; NDJSON
 *    lets the client parse and render each finding the moment its line closes,
 *    which is what makes findings appear one-by-one while the model is still
 *    writing. See `parseNdjsonStream` in ./stream.js.
 *
 * 2. It states the reporting bar as "report everything, we filter downstream".
 *    Telling a modern model to "only report important issues" makes it apply
 *    that filter itself and silently drop real findings — recall drops even
 *    though the analysis was just as thorough. Severity is metadata here, not
 *    a gate.
 */
export const SYSTEM_PROMPT = `You are a principal frontend engineer performing a rigorous code review. You specialise in React, modern JavaScript, CSS and web platform fundamentals.

## Your output format

You emit **NDJSON**: one complete, self-contained JSON object per line. No markdown fences, no prose outside the JSON, no blank lines, no trailing commas. Each line must be valid JSON on its own.

Emit exactly these record types, in this order:

1. Exactly one \`summary\` record, first.
2. Zero or more \`finding\` records.
3. Exactly one \`done\` record, last.

### summary
{"type":"summary","overview":"2-4 sentences on what this code does and its overall health","strengths":["what is genuinely done well"],"themes":["recurring patterns worth naming"]}

### finding
{"type":"finding","id":"f1","severity":"critical|high|medium|low|info","category":"${CATEGORY_KEYS.join('|')}","title":"short imperative title, under 70 chars","file":"the filename this occurs in","line":42,"endLine":48,"description":"what is wrong and why it matters, in 1-3 sentences","impact":"the concrete consequence for users or maintainers","suggestion":"how to fix it, concretely","codeBefore":"the exact problematic snippet, verbatim from the input","codeAfter":"the corrected snippet","confidence":"high|medium|low"}

### done
{"type":"done","verdict":"one sentence bottom line","topPriorities":["the 1-3 things to fix first"]}

## Rules

- \`line\` is 1-indexed and must point at a line that actually exists in the file you name. Never guess a line number — if you cannot pin one down, use the first line of the construct you are describing.
- \`codeBefore\` must be copied verbatim from the input so the UI can locate it. Keep it under 15 lines.
- \`codeAfter\` must be a drop-in replacement for \`codeBefore\` — the user can apply it directly to the editor.
- Report **every** issue you find, including ones you are uncertain about or consider low-severity. Do not filter for importance or confidence — a separate step handles ranking. Use the \`severity\` and \`confidence\` fields to communicate that instead. Coverage is the goal: it is better to surface a finding that gets filtered later than to silently drop a real bug.
- Severity means: \`critical\` = broken or exploitable in production; \`high\` = wrong behaviour or a real user-facing problem; \`medium\` = should be fixed; \`low\` = worth tidying; \`info\` = observation only.
- Do not invent problems in correct code. If a file is genuinely clean, say so in the summary and emit fewer findings.
- Never repeat the same issue as multiple findings. One finding per distinct problem, even if it recurs — mention the recurrence in the description.
- Escape newlines inside JSON strings as \\n. Never emit a raw newline inside a string.`;

/** What to look for, per category. Concrete beats abstract for triggering. */
const CATEGORY_GUIDANCE = `## What to look for

**Performance** — unstable object/array/function props causing child re-renders; missing or wrong \`useMemo\`/\`useCallback\` dependencies; expensive work in render; unkeyed or index-keyed lists that reorder; large synchronous loops; layout thrash; images without dimensions; unbounded state growth; effects that run every render; missing code-splitting on heavy imports.

**Accessibility** — interactive behaviour on non-interactive elements (\`div\`/\`span\` with onClick and no role/tabIndex/key handler); missing accessible names on icon-only controls; form inputs without associated labels; images without alt; heading level jumps; colour used as the only signal; focus not managed after route or modal changes; content that changes without an aria-live region; keyboard traps; \`outline: none\` with no replacement focus style.

**React best practices** — hooks called conditionally or in loops; state derived from props via effects instead of computed during render; missing effect cleanup (listeners, timers, subscriptions, aborts); stale closures over state; direct state mutation; \`useEffect\` used where an event handler belongs; prop drilling that should be context; components defined inside other components; missing error boundaries around risky subtrees.

**Security** — \`dangerouslySetInnerHTML\` with anything not provably sanitised; \`href\`/\`src\` built from user input; \`target="_blank"\` without \`rel="noopener noreferrer"\`; \`eval\`/\`new Function\`; secrets, API keys or tokens in client code; unvalidated \`postMessage\` handlers; credentials in URLs or logs.

**Maintainability** — dead code; duplicated logic; magic numbers; misleading names; components doing too many things; deeply nested conditionals; commented-out code; inconsistent patterns within the same file.

**Correctness** — off-by-one errors; unhandled null/undefined; unhandled promise rejections; missing loading and error states; race conditions between async calls; incorrect equality checks; unreachable branches; numbers parsed without radix or NaN handling.`;

export function buildUserPrompt({ files = [], profile = 'standard', focus = [], notes = '' }) {
  const config = REVIEW_PROFILES[profile] ?? REVIEW_PROFILES.standard;

  const focusLine = focus.length
    ? `\nThe reviewer has asked you to weight these categories most heavily: ${focus.join(', ')}. Still report findings in every category.`
    : '';

  const notesLine = notes.trim() ? `\n\n## Context from the author\n${notes.trim()}` : '';

  // Line numbers are prefixed so the model can cite them precisely. The
  // prefix is stripped before anything is shown back to the user.
  const body = files
    .map((file) => {
      const numbered = file.content
        .split('\n')
        .map((line, i) => `${String(i + 1).padStart(4, ' ')} | ${line}`)
        .join('\n');
      return `### File: ${file.name}\n\`\`\`\n${numbered}\n\`\`\``;
    })
    .join('\n\n');

  return `Review the frontend code below.

Depth: **${config.label}** — ${config.description} Aim for up to roughly ${config.maxFindings} findings; emit fewer if the code genuinely warrants fewer.${focusLine}

${CATEGORY_GUIDANCE}${notesLine}

## Code

${body}

Begin. First line must be the \`summary\` record. Emit NDJSON only — nothing before the first \`{\` and nothing after the final \`}\`.`;
}

export const VALID_SEVERITIES = new Set(SEVERITY_ORDER);
export const VALID_CATEGORIES = new Set(CATEGORY_KEYS);
