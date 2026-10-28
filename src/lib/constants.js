export const APP_NAME = 'CodeLens AI';
export const APP_TAGLINE = 'AI-powered frontend code review';
export const APP_DESCRIPTION =
  'Paste or upload React, JavaScript and CSS and get a streaming AI review with actionable findings for performance, accessibility, security and React best practices.';

/**
 * Severity ladder. `weight` feeds the 0–100 quality score; `rank` drives
 * sort order everywhere findings are listed.
 */
export const SEVERITIES = {
  critical: { label: 'Critical', rank: 0, weight: 25, color: 'severity-critical' },
  high: { label: 'High', rank: 1, weight: 12, color: 'severity-high' },
  medium: { label: 'Medium', rank: 2, weight: 5, color: 'severity-medium' },
  low: { label: 'Low', rank: 3, weight: 2, color: 'severity-low' },
  info: { label: 'Info', rank: 4, weight: 0, color: 'severity-info' },
};

export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

export const CATEGORIES = {
  performance: {
    label: 'Performance',
    icon: 'Zap',
    description: 'Re-renders, bundle weight, expensive work on the main thread',
  },
  accessibility: {
    label: 'Accessibility',
    icon: 'Accessibility',
    description: 'WCAG 2.2, semantics, keyboard and screen-reader support',
  },
  'best-practices': {
    label: 'React Best Practices',
    icon: 'Component',
    description: 'Hooks rules, state modelling, component composition',
  },
  security: {
    label: 'Security',
    icon: 'ShieldAlert',
    description: 'XSS surfaces, unsafe HTML, leaked secrets',
  },
  maintainability: {
    label: 'Maintainability',
    icon: 'Wrench',
    description: 'Naming, dead code, complexity, duplication',
  },
  types: {
    label: 'Correctness',
    icon: 'Bug',
    description: 'Logic bugs, unhandled states, unsafe assumptions',
  },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

/** Charts read colors from here so light/dark stay in sync with the CSS vars. */
export const CATEGORY_COLORS = {
  performance: '#f59e0b',
  accessibility: '#8b5cf6',
  'best-practices': '#3b82f6',
  security: '#ef4444',
  maintainability: '#10b981',
  types: '#ec4899',
};

export const REVIEW_PROFILES = {
  quick: {
    label: 'Quick pass',
    description: 'Surface-level scan. Fastest, cheapest, catches the obvious.',
    effort: 'low',
    maxFindings: 8,
  },
  standard: {
    label: 'Standard review',
    description: 'The default. Balanced depth across every category.',
    effort: 'high',
    maxFindings: 18,
  },
  thorough: {
    label: 'Thorough audit',
    description: 'Deep reasoning, edge cases, subtle correctness bugs.',
    effort: 'xhigh',
    maxFindings: 30,
  },
};

export const ACCEPTED_EXTENSIONS = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.css',
  '.scss',
  '.html',
  '.vue',
  '.svelte',
  '.json',
];

export const MAX_FILE_BYTES = 256 * 1024; // 256KB per file
export const MAX_TOTAL_BYTES = 1024 * 1024; // 1MB per review
export const MAX_FILES = 20;

export const STORAGE_KEYS = {
  reviews: 'codelens.reviews.v1',
  settings: 'codelens.settings.v1',
  workspace: 'codelens.workspace.v1',
};
