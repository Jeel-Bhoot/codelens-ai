import { runStaticAnalysis } from '../analysis/static-rules';
import { hashString } from '../utils';

/**
 * Demo reviewer.
 *
 * Used when no Anthropic key is configured, or when demo mode is forced. It is
 * *not* canned output: it runs the same deterministic rule engine over the
 * user's actual code, then dresses the result up with the narrative parts a
 * model would contribute (overview, themes, verdict). Same NDJSON records, same
 * SSE envelope, same client code path — so the deployed portfolio demo behaves
 * identically to the real thing without costing a token per visitor.
 */

const OVERVIEW_TEMPLATES = [
  ({ fileCount, lineCount, topCategory }) =>
    `This is a ${lineCount}-line frontend change across ${fileCount} file${fileCount === 1 ? '' : 's'}. The structure is readable and the intent of each component is clear from its name. The bulk of what surfaced clusters around ${topCategory}, which is where I would spend review time first.`,
  ({ fileCount, lineCount, topCategory }) =>
    `${fileCount} file${fileCount === 1 ? '' : 's'}, ${lineCount} lines. Composition is reasonable and nothing here is architecturally wrong. The recurring theme is ${topCategory} — individually minor, but they compound as this code grows.`,
  ({ lineCount, topCategory }) =>
    `A ${lineCount}-line submission with a conventional component layout. Naming is consistent and data flow is easy to follow. Most of the risk sits in ${topCategory}; the rest is polish.`,
];

const STRENGTH_POOL = [
  'Component boundaries are drawn sensibly — each one has a single clear responsibility.',
  'Naming is consistent and self-describing; very little guessing required to follow the flow.',
  'State is kept close to where it is used rather than being hoisted unnecessarily.',
  'No obviously dead code or commented-out blocks left behind.',
  'Formatting is uniform throughout, which keeps the diff readable.',
  'Conditional rendering is handled with early returns rather than deep ternaries.',
];

const CATEGORY_LABELS = {
  performance: 'render performance',
  accessibility: 'accessibility',
  'best-practices': 'React lifecycle and hook usage',
  security: 'security',
  maintainability: 'maintainability',
  types: 'correctness',
};

/**
 * Findings the rule engine can't reach — these need reading comprehension, so
 * they are selected by the shape of the code rather than a regex match.
 */
const INFERRED_FINDINGS = [
  {
    when: (src) => /useState/.test(src) && /useEffect/.test(src) && /set[A-Z]\w*\(/.test(src),
    severity: 'medium',
    category: 'best-practices',
    title: 'State derived in an effect instead of during render',
    description:
      'A useEffect that reads props or state and immediately calls a setter is computing derived data one render late.',
    impact:
      'Produces a visible intermediate frame with stale values, and doubles the render count for every change.',
    suggestion:
      'Compute the value during render — `const total = items.reduce(...)` — and reach for useMemo only if profiling shows the computation is actually expensive.',
    confidence: 'medium',
  },
  {
    when: (src) => /fetch\s*\(|axios\.|\.then\s*\(/.test(src),
    severity: 'high',
    category: 'types',
    title: 'Async request has no error or loading state',
    description:
      'The request path handles the success case but nothing branches on failure or in-flight status.',
    impact:
      'On a slow or failing network the UI shows an empty state indistinguishable from "no results", with no way to retry.',
    suggestion:
      'Track status explicitly (idle / loading / error / success) and render each. If you already use TanStack Query, its isPending and isError flags give you this for free.',
    confidence: 'medium',
  },
  {
    when: (src) => /fetch\s*\(/.test(src) && !/AbortController|signal/.test(src),
    severity: 'medium',
    category: 'best-practices',
    title: 'Fetch not aborted on unmount',
    description:
      'A request started in an effect keeps running after the component unmounts, and its resolution still calls setState.',
    impact:
      'Race conditions where a slow earlier request overwrites a fast later one, plus warnings about updating unmounted components.',
    suggestion:
      'Create an AbortController in the effect, pass controller.signal to fetch, and call controller.abort() in the cleanup.',
    confidence: 'high',
  },
  {
    when: (src) => /\.map\s*\(/.test(src) && /\.filter\s*\(/.test(src),
    severity: 'low',
    category: 'performance',
    title: 'Chained array traversals rebuilt every render',
    description:
      'filter followed by map walks the collection twice and allocates a new array on each render, even when the source has not changed.',
    impact:
      'Negligible on small lists; measurable once the collection grows past a few hundred items.',
    suggestion:
      'Wrap the derived list in useMemo keyed on the source array, or collapse the two passes into a single reduce.',
    confidence: 'low',
  },
  {
    when: (src) => /<form|onSubmit/.test(src),
    severity: 'medium',
    category: 'accessibility',
    title: 'Form validation errors are not announced',
    description:
      'Validation messages are rendered visually but sit outside any live region, so assistive technology never announces them.',
    impact:
      'A screen-reader user submits, nothing is announced, and there is no indication why the form did not proceed.',
    suggestion:
      'Give the error element role="alert" (or aria-live="polite"), and link it to the field with aria-describedby plus aria-invalid.',
    confidence: 'medium',
  },
  {
    when: (src) => /className\s*=\s*["'][^"']{80,}/.test(src),
    severity: 'info',
    category: 'maintainability',
    title: 'Very long inline class strings',
    description:
      'Several elements carry class strings long enough that the markup structure is hard to read at a glance.',
    impact: 'Slows review and makes it easy to miss a duplicated or conflicting utility.',
    suggestion:
      'Extract repeated combinations into a cva variant or a small wrapper component so intent is named rather than spelled out.',
    confidence: 'high',
  },
  {
    when: (src) => /useCallback|useMemo/.test(src),
    severity: 'low',
    category: 'performance',
    title: 'Memoisation applied without a measured cause',
    description:
      'useMemo and useCallback are used on values that are cheap to recompute. Each one has its own comparison and allocation cost.',
    impact:
      'Adds indirection and a dependency array to keep correct, in exchange for no measurable win.',
    suggestion:
      'Keep memoisation where a profile shows a real cost or where referential identity is load-bearing for a memoised child. Remove it elsewhere.',
    confidence: 'low',
  },
  {
    when: (src) => /position:\s*absolute|position:\s*fixed/.test(src),
    severity: 'low',
    category: 'maintainability',
    title: 'Absolute positioning where layout primitives would do',
    description:
      'Absolute and fixed positioning is used for arrangement that flexbox or grid handles declaratively.',
    impact: 'Fragile under content-length changes, zoom, and small viewports.',
    suggestion:
      'Reserve absolute positioning for genuine overlays. Use flex or grid for in-flow arrangement so the layout adapts on its own.',
    confidence: 'low',
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Streams words with a small jitter so the demo reads like generation rather
 * than a paste. Seeded from the input hash, so the same code always produces
 * the same review — important for a demo you want to show twice.
 */
async function* typeOut(text, seed, baseDelay = 12) {
  const words = text.split(' ');
  for (let i = 0; i < words.length; i += 1) {
    const jitter = ((seed + i * 37) % 11) - 5;

    await sleep(Math.max(4, baseDelay + jitter));
    yield i === words.length - 1 ? words[i] : `${words[i]} `;
  }
}

/**
 * @returns {AsyncGenerator<{event: string, data: object}>}
 */
export async function* generateDemoReview({ files = [], profile = 'standard' }) {
  const source = files.map((f) => f.content).join('\n');
  const lineCount = source.split('\n').length;
  const seed = hashString(source || 'empty');

  const staticFindings = runStaticAnalysis(files);

  const inferred = INFERRED_FINDINGS.filter((rule) => rule.when(source)).map((rule, index) => ({
    type: 'finding',
    id: `demo_inferred_${index}`,
    severity: rule.severity,
    category: rule.category,
    title: rule.title,
    file: files[0]?.name ?? 'input.jsx',
    line: 1 + ((seed + index * 13) % Math.max(1, lineCount - 1)),
    endLine: null,
    description: rule.description,
    impact: rule.impact,
    suggestion: rule.suggestion,
    codeBefore: '',
    codeAfter: '',
    confidence: rule.confidence,
    source: 'ai',
  }));

  const budget = profile === 'quick' ? 8 : profile === 'thorough' ? 30 : 18;
  const all = [...staticFindings, ...inferred].slice(0, budget);

  // Which category dominates — used to write the overview.
  const tally = all.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {});
  const topCategory =
    CATEGORY_LABELS[Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0]] ??
    'general code quality';

  yield { event: 'status', data: { phase: 'reasoning' } };

  const reasoning = `Reading ${files.length} file${files.length === 1 ? '' : 's'}, ${lineCount} lines total. Mapping component boundaries and data flow first, then checking hook dependencies, then sweeping for accessibility and security surfaces before ranking what I find.`;
  for await (const token of typeOut(reasoning, seed, 9)) {
    yield { event: 'reasoning', data: { text: token } };
  }

  yield { event: 'status', data: { phase: 'reviewing' } };

  const overview = OVERVIEW_TEMPLATES[seed % OVERVIEW_TEMPLATES.length]({
    fileCount: files.length,
    lineCount,
    topCategory,
  });

  const strengths = [
    STRENGTH_POOL[seed % STRENGTH_POOL.length],
    STRENGTH_POOL[(seed + 3) % STRENGTH_POOL.length],
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  yield {
    event: 'record',
    data: {
      type: 'summary',
      overview,
      strengths,
      themes: Object.keys(tally)
        .slice(0, 3)
        .map((c) => CATEGORY_LABELS[c] ?? c),
    },
  };

  for (const finding of all) {
    await sleep(180 + (seed % 140));
    yield { event: 'record', data: finding };
  }

  await sleep(220);

  const criticalCount = all.filter((f) => f.severity === 'critical').length;
  const highCount = all.filter((f) => f.severity === 'high').length;

  const verdict = criticalCount
    ? `${criticalCount} critical issue${criticalCount === 1 ? '' : 's'} to resolve before this ships; the rest can follow.`
    : highCount
      ? `Nothing blocking, but ${highCount} high-severity item${highCount === 1 ? '' : 's'} should be handled in this change rather than deferred.`
      : all.length
        ? 'Solid overall — everything found here is polish rather than a blocker.'
        : 'Clean. Nothing worth flagging in this pass.';

  yield {
    event: 'record',
    data: {
      type: 'done',
      verdict,
      topPriorities: all
        .filter((f) => f.severity === 'critical' || f.severity === 'high')
        .slice(0, 3)
        .map((f) => f.title),
    },
  };

  yield {
    event: 'complete',
    data: { mode: 'demo', findingCount: all.length, usage: null },
  };
}
