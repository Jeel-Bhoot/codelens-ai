/**
 * Key → provider, by prefix.
 *
 * Deliberately dependency-free and in its own module: the settings form needs
 * it, and importing it from providers/index.js would drag the Anthropic SDK
 * into the client bundle.
 *
 * Google issues AI Studio keys in two shapes: the long-standing `AIza…` and a
 * newer `AQ.…`. Matching only the old one silently rejected valid keys with a
 * message telling the user their real key was invalid — worse than no check.
 */
const PREFIXES = [
  { provider: 'anthropic', prefix: 'sk-ant-' },
  { provider: 'gemini', prefix: 'AIza' },
  { provider: 'gemini', prefix: 'AQ.' },
];

export function providerForKey(key) {
  const value = String(key ?? '').trim();
  if (!value) return null;
  return PREFIXES.find((p) => value.startsWith(p.prefix))?.provider ?? null;
}

export const PROVIDER_LABELS = {
  anthropic: 'Anthropic (Claude)',
  gemini: 'Google (Gemini)',
  local: 'Local analysis engine',
  demo: 'Local analysis engine',
};
