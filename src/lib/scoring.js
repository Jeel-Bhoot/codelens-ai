import { SEVERITIES, SEVERITY_ORDER, CATEGORY_KEYS } from './constants';

/**
 * Quality score, 0–100.
 *
 * Deliberately not a plain "100 minus findings" count: severity weights are
 * summed and then normalised against file volume, so a 2000-line codebase
 * with four medium issues doesn't score worse than a 40-line one with the
 * same four. The log curve keeps very large inputs from trivially scoring 100.
 */
export function computeScore(findings = [], totalLines = 0) {
  if (!findings.length) return 100;

  const penalty = findings.reduce(
    (sum, f) => sum + (SEVERITIES[f.severity]?.weight ?? SEVERITIES.info.weight),
    0
  );

  const volumeFactor = Math.max(1, Math.log10(Math.max(totalLines, 10)) / 2);
  const normalised = penalty / volumeFactor;

  return Math.max(0, Math.min(100, Math.round(100 - normalised)));
}

export function scoreGrade(score) {
  if (score >= 90) return { grade: 'A', label: 'Excellent', tone: 'text-emerald-500' };
  if (score >= 80) return { grade: 'B', label: 'Good', tone: 'text-lime-500' };
  if (score >= 70) return { grade: 'C', label: 'Fair', tone: 'text-amber-500' };
  if (score >= 55) return { grade: 'D', label: 'Needs work', tone: 'text-orange-500' };
  return { grade: 'F', label: 'Critical', tone: 'text-red-500' };
}

export function countBySeverity(findings = []) {
  const counts = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, 0]));
  findings.forEach((f) => {
    if (counts[f.severity] !== undefined) counts[f.severity] += 1;
  });
  return counts;
}

export function countByCategory(findings = []) {
  const counts = Object.fromEntries(CATEGORY_KEYS.map((c) => [c, 0]));
  findings.forEach((f) => {
    if (counts[f.category] !== undefined) counts[f.category] += 1;
  });
  return counts;
}

/** Critical first, then by file, then by line. Stable for equal keys. */
export function sortFindings(findings = []) {
  return [...findings].sort((a, b) => {
    const sev = (SEVERITIES[a.severity]?.rank ?? 9) - (SEVERITIES[b.severity]?.rank ?? 9);
    if (sev !== 0) return sev;
    const file = (a.file || '').localeCompare(b.file || '');
    if (file !== 0) return file;
    return (a.line || 0) - (b.line || 0);
  });
}

export function filterFindings(findings, { severities = [], categories = [], query = '' } = {}) {
  const q = query.trim().toLowerCase();
  return findings.filter((f) => {
    if (severities.length && !severities.includes(f.severity)) return false;
    if (categories.length && !categories.includes(f.category)) return false;
    if (!q) return true;
    return (
      f.title?.toLowerCase().includes(q) ||
      f.description?.toLowerCase().includes(q) ||
      f.file?.toLowerCase().includes(q)
    );
  });
}
