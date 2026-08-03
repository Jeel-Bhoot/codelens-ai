/**
 * Local heuristic pass.
 *
 * Runs entirely in the browser the moment code is pasted, before any network
 * request. Two reasons it exists:
 *
 *   1. Feedback latency — the user sees real findings in ~5ms instead of
 *      waiting on a model round-trip.
 *   2. It grounds the AI review. Findings from here are merged with the model's
 *      and deduplicated by (file, line, category), so the deterministic checks
 *      act as a floor the model can't fall below.
 *
 * These are regex heuristics, not an AST pass — each rule carries `confidence`
 * so the UI can be honest about that. Comments are stripped before matching;
 * string bodies are masked only for the rules listed in CODE_ONLY_RULES, since
 * the rest legitimately match inside quotes (see `stripComments` below).
 */

const RULES = [
  {
    id: 'a11y-div-onclick',
    test: /<(div|span|li|td)\b[^>]*\bonClick\s*=/i,
    reject: /\brole\s*=|\btabIndex\s*=/i,
    severity: 'high',
    category: 'accessibility',
    title: 'Click handler on a non-interactive element',
    description:
      'A div or span with onClick is invisible to keyboard and screen-reader users — it is not focusable and announces no role.',
    impact: 'Keyboard-only and assistive-technology users cannot trigger this action at all.',
    suggestion:
      'Use a <button type="button">. If the element must stay a div, add role="button", tabIndex={0} and an onKeyDown handler for Enter and Space.',
    confidence: 'high',
  },
  {
    id: 'a11y-img-alt',
    test: /<img\b(?![^>]*\balt\s*=)[^>]*>/i,
    severity: 'high',
    category: 'accessibility',
    title: 'Image is missing an alt attribute',
    description:
      'Without alt, screen readers fall back to announcing the filename, or skip the image entirely.',
    impact: 'Non-sighted users lose whatever information the image carries.',
    suggestion:
      'Add descriptive alt text. For purely decorative images use alt="" so it is skipped deliberately.',
    confidence: 'high',
  },
  {
    id: 'a11y-icon-button',
    test: /<button\b(?![^>]*aria-label)(?![^>]*title=)[^>]*>\s*\{?\s*<[A-Z]\w*\s*\/?>?\s*\}?\s*<\/button>/,
    severity: 'medium',
    category: 'accessibility',
    title: 'Icon-only button has no accessible name',
    description:
      'A button whose only child is an icon component exposes no text to the accessibility tree.',
    impact: 'Screen readers announce it as an unlabelled "button" with no indication of purpose.',
    suggestion: 'Add aria-label to the button, or include visually-hidden text alongside the icon.',
    confidence: 'medium',
  },
  {
    id: 'a11y-outline-none',
    test: /outline:\s*(none|0)\b/i,
    reject: /:focus-visible|box-shadow|outline-offset/i,
    severity: 'medium',
    category: 'accessibility',
    title: 'Focus outline removed with no replacement',
    description:
      'Removing the default outline without providing an alternative focus style leaves keyboard users unable to see where they are.',
    impact: 'Keyboard navigation becomes effectively invisible.',
    suggestion:
      'Keep a visible indicator: use :focus-visible with a ring, box-shadow or custom outline instead of removing it outright.',
    confidence: 'medium',
  },
  {
    id: 'sec-dangerous-html',
    test: /dangerouslySetInnerHTML/,
    severity: 'critical',
    category: 'security',
    title: 'dangerouslySetInnerHTML introduces an XSS surface',
    description:
      'Injecting raw HTML executes any script it contains. Unless the value is provably sanitised, this is a cross-site scripting vector.',
    impact:
      'An attacker who controls any part of that string can run JavaScript in your users’ sessions.',
    suggestion:
      'Render as text, or sanitise with a vetted library (DOMPurify) immediately before injection — never trust upstream sanitisation.',
    confidence: 'high',
  },
  {
    id: 'sec-target-blank',
    test: /target\s*=\s*["'{]?_blank/,
    reject: /rel\s*=\s*["'][^"']*noopener/,
    severity: 'medium',
    category: 'security',
    title: 'target="_blank" without rel="noopener"',
    description:
      'The opened page receives a window.opener reference back to your page and can navigate it elsewhere.',
    impact: 'Enables reverse tabnabbing phishing, and costs performance on older browsers.',
    suggestion: 'Add rel="noopener noreferrer" to the anchor.',
    confidence: 'high',
  },
  {
    id: 'sec-eval',
    test: /\beval\s*\(|new\s+Function\s*\(/,
    severity: 'critical',
    category: 'security',
    title: 'Dynamic code execution via eval or new Function',
    description:
      'Evaluating strings as code executes anything that reaches that string, and defeats Content-Security-Policy.',
    impact: 'Any input that flows into this call becomes arbitrary code execution.',
    suggestion:
      'Replace with explicit parsing — JSON.parse for data, or a lookup map for dynamic dispatch.',
    confidence: 'high',
  },
  {
    id: 'sec-hardcoded-secret',
    test: /(api[_-]?key|secret|password|token|bearer)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i,
    severity: 'critical',
    category: 'security',
    title: 'Possible hardcoded credential',
    description:
      'A long literal string is assigned to a secret-shaped identifier. Anything in client code ships to every visitor.',
    impact: 'The credential is readable by anyone who opens devtools, and is now in git history.',
    suggestion:
      'Move it to a server-side environment variable and proxy the call through a route handler. Rotate the key — assume it is compromised.',
    confidence: 'medium',
  },
  {
    id: 'perf-index-key',
    test: /\.map\s*\(\s*\(?\s*\w+\s*,\s*(\w+)\s*\)?\s*=>[\s\S]{0,200}?key\s*=\s*\{\s*\1\s*\}/,
    severity: 'medium',
    category: 'performance',
    title: 'Array index used as a React key',
    description:
      'Index keys tie identity to position. When the list reorders, inserts or deletes, React reuses the wrong DOM nodes and component state.',
    impact:
      'Input values, scroll position and animation state can jump between rows after a reorder.',
    suggestion:
      'Key on a stable id from the data. Index keys are only safe for lists that never reorder and never change length.',
    confidence: 'medium',
  },
  {
    id: 'perf-inline-object-prop',
    test: /<[A-Z]\w*[^>]*\s(?:style|config|options|data|sx)\s*=\s*\{\{/,
    severity: 'low',
    category: 'performance',
    title: 'Inline object literal passed as a prop',
    description:
      'A fresh object is allocated on every render, so its reference always differs and memoised children re-render regardless.',
    impact: 'Defeats React.memo on the child and adds avoidable allocation pressure.',
    suggestion: 'Hoist the object outside the component, or wrap it in useMemo.',
    confidence: 'low',
  },
  {
    id: 'perf-effect-no-deps',
    test: /useEffect\s*\(\s*(?:\(\s*\)|async\s*\(\s*\))\s*=>\s*\{[\s\S]{0,400}?\}\s*\)\s*;?\s*$/m,
    severity: 'high',
    category: 'performance',
    title: 'useEffect with no dependency array',
    description:
      'Omitting the dependency array entirely runs the effect after every single render.',
    impact:
      'If the effect sets state or fetches, this becomes an infinite render loop or a request storm.',
    suggestion:
      'Add a dependency array. Use [] for mount-only, or list every reactive value the effect reads.',
    confidence: 'medium',
  },
  {
    id: 'react-effect-cleanup',
    test: /addEventListener\s*\(/,
    reject: /removeEventListener|AbortController|\{\s*signal/,
    severity: 'high',
    category: 'best-practices',
    title: 'Event listener added without cleanup',
    description:
      'A listener registered in a component with no matching removal survives unmount and keeps the component closure alive.',
    impact:
      'Memory leak, plus handlers firing against unmounted components — a common source of "cannot update state on unmounted component".',
    suggestion:
      'Return a cleanup function from useEffect that calls removeEventListener, or pass an AbortController signal to addEventListener.',
    confidence: 'medium',
  },
  {
    id: 'react-timer-cleanup',
    test: /(setInterval|setTimeout)\s*\(/,
    reject: /(clearInterval|clearTimeout)/,
    severity: 'medium',
    category: 'best-practices',
    title: 'Timer created without a matching clear',
    description:
      'setTimeout / setInterval inside a component keeps running after unmount unless explicitly cleared.',
    impact: 'Leaks memory and can trigger state updates against a component that no longer exists.',
    suggestion: 'Capture the handle and clear it in the effect cleanup function.',
    confidence: 'low',
  },
  {
    id: 'react-state-mutation',
    test: /\b(\w+)\.push\s*\(|\b(\w+)\[\s*\d+\s*\]\s*=\s*(?!=)/,
    requires: /useState|useReducer/,
    severity: 'high',
    category: 'best-practices',
    title: 'Possible direct mutation of state',
    description:
      'Mutating an array or object held in state in place does not change its reference, so React sees no update.',
    impact: 'The UI silently fails to re-render, producing bugs that look intermittent.',
    suggestion:
      'Produce a new value instead: setItems((prev) => [...prev, next]) rather than items.push(next).',
    confidence: 'low',
  },
  {
    id: 'correctness-parseint-radix',
    test: /parseInt\s*\(\s*[^,)]+\)/,
    severity: 'low',
    category: 'types',
    title: 'parseInt called without a radix',
    description: 'Omitting the radix leaves base detection to the engine for some legacy inputs.',
    impact: 'Strings with a leading 0 or 0x can parse to an unexpected number.',
    suggestion: 'Pass the radix explicitly: parseInt(value, 10), or use Number(value).',
    confidence: 'high',
  },
  {
    id: 'correctness-loose-equality',
    test: /[^=!<>]==[^=]|[^=!]!=[^=]/,
    severity: 'low',
    category: 'types',
    title: 'Loose equality comparison',
    description: '== and != apply type coercion, which produces surprising results across types.',
    impact: 'Comparisons like "" == 0 and null == undefined evaluate true unintentionally.',
    suggestion: 'Use === and !==. Use == null deliberately only when checking null-or-undefined.',
    confidence: 'medium',
  },
  {
    id: 'maintain-console',
    test: /console\.(log|debug|info)\s*\(/,
    severity: 'info',
    category: 'maintainability',
    title: 'console statement left in source',
    description: 'Debug logging shipped to production adds noise and can leak internal state.',
    impact: 'Clutters user consoles and may expose data shapes to anyone inspecting the page.',
    suggestion: 'Remove it, or route through a logger that is stripped at build time.',
    confidence: 'high',
  },
  {
    id: 'maintain-todo',
    test: /\/\/\s*(TODO|FIXME|HACK|XXX)\b/i,
    scanRaw: true,
    severity: 'info',
    category: 'maintainability',
    title: 'Unresolved TODO / FIXME marker',
    description: 'An open marker in committed code signals known-incomplete work.',
    impact: 'Tends to outlive the context that produced it and quietly becomes permanent.',
    suggestion: 'Resolve it, or move it to the issue tracker with enough context to act on.',
    confidence: 'high',
  },
  {
    id: 'perf-img-no-dimensions',
    test: /<img\b(?![^>]*\bwidth)(?![^>]*\bheight)[^>]*\bsrc\s*=/i,
    severity: 'medium',
    category: 'performance',
    title: 'Image without explicit dimensions',
    description:
      'Without width and height the browser cannot reserve space before the image loads.',
    impact: 'Causes layout shift as images arrive — directly hurts Cumulative Layout Shift.',
    suggestion:
      'Set width and height attributes (or a CSS aspect-ratio). In Next.js, prefer next/image.',
    confidence: 'medium',
  },
  {
    id: 'a11y-input-no-label',
    test: /<input\b(?![^>]*\baria-label)(?![^>]*\baria-labelledby)(?![^>]*\btype\s*=\s*["'](hidden|submit)["'])[^>]*>/i,
    requiresAbsent: /<label/i,
    severity: 'high',
    category: 'accessibility',
    title: 'Form input has no associated label',
    description: 'An input with no <label>, aria-label or aria-labelledby has no accessible name.',
    impact:
      'Screen readers announce it as an unlabelled field, and the click target for the label is lost.',
    suggestion:
      'Add a <label htmlFor> tied to the input id, or aria-label when a visible label is not wanted.',
    confidence: 'low',
  },
];

/**
 * Strip comments, so a rule never fires on prose that merely *describes* the
 * problem it looks for.
 *
 * String contents are deliberately preserved. Half these rules match inside
 * quoted values — `target="_blank"`, a credential assigned to a literal,
 * `outline: none` in a CSS declaration. An earlier revision blanked string
 * bodies here as well, and the `sec-target-blank` and `sec-hardcoded-secret`
 * rules silently stopped matching anything: the pass reported a clean file
 * while the XSS-adjacent findings sat right there in the source.
 */
function stripComments(line) {
  return line.replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Additionally blank out string bodies. Used only by rules whose pattern is a
 * *code construct* (`eval(`, `==`, `parseInt(`, `console.log(`), where an
 * occurrence inside a string literal is noise rather than a finding.
 */
function maskStrings(line) {
  return line.replace(
    /(["'`])(?:\\.|(?!\1)[^\\])*\1/g,
    (match) => match[0] + ' '.repeat(Math.max(0, match.length - 2)) + match[0]
  );
}

/** Rules that must not match inside a string literal. */
const CODE_ONLY_RULES = new Set([
  'sec-eval',
  'correctness-parseint-radix',
  'correctness-loose-equality',
  'maintain-console',
  'react-state-mutation',
]);

/**
 * @param {{name: string, content: string}[]} files
 * @returns {object[]} findings in the same shape the AI produces
 */
export function runStaticAnalysis(files = []) {
  const findings = [];

  files.forEach((file) => {
    const rawLines = file.content.split('\n');

    // Two views of the same file. Most rules read `codeLines` (comments gone,
    // strings intact); the code-construct rules read `strictLines`.
    const codeLines = rawLines.map(stripComments);
    const strictLines = codeLines.map(maskStrings);

    const codeSource = codeLines.join('\n');
    const firedInFile = new Set();

    rawLines.forEach((rawLine, index) => {
      RULES.forEach((rule) => {
        if (firedInFile.has(rule.id)) return; // one finding per rule per file

        // TODO/FIXME markers live *in* comments, so that rule reads the raw line.
        const lines = rule.scanRaw
          ? rawLines
          : CODE_ONLY_RULES.has(rule.id)
            ? strictLines
            : codeLines;

        const line = lines[index];
        if (!line.trim()) return;

        // A small window of context so multi-line JSX still matches.
        const windowText = lines.slice(index, index + 4).join('\n');

        if (!rule.test.test(line) && !rule.test.test(windowText)) return;
        if (rule.reject && (rule.reject.test(windowText) || rule.reject.test(codeSource))) return;
        if (rule.requires && !rule.requires.test(codeSource)) return;
        if (rule.requiresAbsent && rule.requiresAbsent.test(codeSource)) return;

        firedInFile.add(rule.id);
        findings.push({
          type: 'finding',
          id: `static_${file.name}_${rule.id}`,
          severity: rule.severity,
          category: rule.category,
          title: rule.title,
          file: file.name,
          line: index + 1,
          endLine: index + 1,
          description: rule.description,
          impact: rule.impact,
          suggestion: rule.suggestion,
          codeBefore: rawLine.trim(),
          codeAfter: '',
          confidence: rule.confidence,
          source: 'static',
        });
      });
    });
  });

  return findings;
}

/**
 * Merge static and AI findings, dropping static entries the model already
 * reported. Same file + same category within 3 lines is treated as the same
 * issue; the AI version wins because it carries a concrete fix.
 */
export function mergeFindings(staticFindings = [], aiFindings = []) {
  const covered = aiFindings.map((f) => ({
    file: f.file,
    category: f.category,
    line: f.line ?? -999,
  }));

  const survivors = staticFindings.filter(
    (s) =>
      !covered.some(
        (a) =>
          a.file === s.file && a.category === s.category && Math.abs(a.line - (s.line ?? 0)) <= 3
      )
  );

  return [...aiFindings, ...survivors];
}
