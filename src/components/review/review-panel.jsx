'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'markdown-to-jsx';
import {
  Brain,
  ChevronDown,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  ScanSearch,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton, Tooltip } from '@/components/ui/misc';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { FindingCard } from '@/components/review/finding-card';
import { ScoreRing } from '@/components/review/score-ring';
import { useReviewStore } from '@/store/review-store';
import { useSettingsStore } from '@/store/settings-store';
import { computeScore, sortFindings, filterFindings, countBySeverity } from '@/lib/scoring';
import { SEVERITY_ORDER, SEVERITIES, CATEGORIES, CATEGORY_KEYS } from '@/lib/constants';
import { formatDuration, pluralize, cn } from '@/lib/utils';

const PHASE_COPY = {
  analyzing: 'Reading your files…',
  reasoning: 'Thinking through the code…',
  reviewing: 'Writing findings…',
};

export function ReviewPanel() {
  const run = useReviewStore((s) => s.run);
  const focusedFindingId = useReviewStore((s) => s.focusedFindingId);

  // Same rule as the file manager: select state, derive during render.
  const files = useReviewStore((s) => s.files);
  const totalLines = useMemo(
    () => files.reduce((sum, f) => sum + f.content.split('\n').length, 0),
    [files]
  );

  const showReasoning = useSettingsStore((s) => s.showReasoning);
  const autoScroll = useSettingsStore((s) => s.autoScrollFindings);

  const [query, setQuery] = useState('');
  const [severities, setSeverities] = useState([]);
  const [categories, setCategories] = useState([]);
  /** null = follow the run automatically; a boolean = the user overrode it. */
  const [reasoningOverride, setReasoningOverride] = useState(null);

  const listRef = useRef(null);
  const reasoningRef = useRef(null);

  const isStreaming = ['analyzing', 'reasoning', 'reviewing'].includes(run.status);

  // Derived rather than synced: the panel opens while the model is thinking
  // and closes once findings start, unless the user has said otherwise.
  const reasoningOpen = reasoningOverride ?? (showReasoning && run.status === 'reasoning');

  const sorted = useMemo(() => sortFindings(run.findings), [run.findings]);
  const visible = useMemo(
    () => filterFindings(sorted, { severities, categories, query }),
    [sorted, severities, categories, query]
  );
  const counts = useMemo(() => countBySeverity(run.findings), [run.findings]);
  const score = useMemo(() => computeScore(run.findings, totalLines), [run.findings, totalLines]);

  // Keep the newest finding in view while streaming, unless the user has
  // scrolled up to read something — then leave their scroll position alone.
  useEffect(() => {
    if (!isStreaming || !autoScroll || !listRef.current) return;
    const el = listRef.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 220;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [run.findings.length, isStreaming, autoScroll]);

  useEffect(() => {
    if (reasoningOpen && reasoningRef.current) {
      reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight;
    }
  }, [run.reasoning, reasoningOpen]);

  const toggle = (list, setList, value) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  /* -------------------------------------------------------- empty state -- */

  if (run.status === 'idle') {
    return (
      <div className="grid h-full place-items-center p-8 text-center">
        <div className="max-w-xs">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <ScanSearch className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-semibold">Nothing reviewed yet</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Hit <strong>Review</strong> — or press{' '}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘↵</kbd> —
            and findings will stream in here as they are written.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* ------------------------------------------------------- header -- */}
      <div className="border-b p-4">
        <div className="flex items-start gap-4">
          {run.status === 'complete' ? (
            <ScoreRing score={score} size={78} strokeWidth={7} />
          ) : (
            <div className="grid h-[78px] w-[78px] place-items-center">
              <span className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {isStreaming ? (
              <>
                <p className="text-sm font-medium">{PHASE_COPY[run.status]}</p>
                <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
                  {run.findings.length
                    ? `${pluralize(run.findings.length, 'finding')} so far`
                    : 'Scanning…'}
                </p>
              </>
            ) : run.status === 'error' ? (
              <>
                <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  Review failed
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{run.error}</p>
              </>
            ) : (
              <>
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                  {run.status === 'cancelled' ? 'Cancelled' : 'Review complete'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pluralize(run.findings.length, 'finding')}
                  {run.startedAt && run.finishedAt
                    ? ` · ${formatDuration(run.finishedAt - run.startedAt)}`
                    : ''}
                  {run.model ? ` · ${run.model}` : ''}
                </p>
              </>
            )}

            {/* severity chips */}
            <div className="mt-2.5 flex flex-wrap gap-1">
              {SEVERITY_ORDER.filter((s) => counts[s] > 0).map((severity) => (
                <Badge key={severity} variant={severity} className="text-[10px]">
                  {counts[severity]} {SEVERITIES[severity].label.toLowerCase()}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {run.warning ? (
          <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            {run.warning}
          </p>
        ) : null}
      </div>

      {/* ---------------------------------------------------- reasoning -- */}
      {showReasoning && run.reasoning ? (
        <div className="border-b">
          <button
            type="button"
            onClick={() => setReasoningOverride(!reasoningOpen)}
            aria-expanded={reasoningOpen}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Brain className="h-3.5 w-3.5" aria-hidden="true" />
            Reasoning
            {run.status === 'reasoning' ? (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            ) : null}
            <ChevronDown
              className={cn(
                'ml-auto h-3.5 w-3.5 transition-transform',
                reasoningOpen && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </button>

          {reasoningOpen ? (
            <div
              ref={reasoningRef}
              className="scrollbar-thin max-h-44 overflow-y-auto border-t bg-muted/20 px-4 py-3"
            >
              <p
                className={cn(
                  'whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground',
                  run.status === 'reasoning' && 'streaming-caret'
                )}
              >
                {run.reasoning}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ------------------------------------------------------ summary -- */}
      {run.summary ? (
        <div className="border-b px-4 py-3">
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-0 prose-p:text-sm prose-p:leading-relaxed">
            <Markdown>{run.summary.overview || ''}</Markdown>
          </div>

          {run.summary.strengths?.length ? (
            <ul className="mt-3 space-y-1">
              {run.summary.strengths.map((strength) => (
                <li key={strength} className="flex gap-2 text-xs text-muted-foreground">
                  <Sparkles
                    className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500"
                    aria-hidden="true"
                  />
                  {strength}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* ------------------------------------------------------ filters -- */}
      {run.findings.length ? (
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter findings…"
              className="h-8 pl-8 text-xs"
              aria-label="Filter findings by text"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="sr-only">Filter by severity and category</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Severity</DropdownMenuLabel>
              {SEVERITY_ORDER.map((severity) => (
                <DropdownMenuCheckboxItem
                  key={severity}
                  checked={severities.includes(severity)}
                  onCheckedChange={() => toggle(severities, setSeverities, severity)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {SEVERITIES[severity].label}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {counts[severity] ?? 0}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Category</DropdownMenuLabel>
              {CATEGORY_KEYS.map((key) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={categories.includes(key)}
                  onCheckedChange={() => toggle(categories, setCategories, key)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {CATEGORIES[key].label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      {/* ----------------------------------------------------- findings -- */}
      <div ref={listRef} className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-3">
        {visible.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            isFocused={finding.id === focusedFindingId}
          />
        ))}

        {isStreaming ? (
          <div className="space-y-2 rounded-lg border border-dashed p-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ) : null}

        {!visible.length && !isStreaming ? (
          <div className="grid place-items-center py-16 text-center">
            <div>
              {run.findings.length ? (
                <>
                  <p className="text-sm font-medium">No findings match those filters</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setQuery('');
                      setSeverities([]);
                      setCategories([]);
                    }}
                  >
                    Clear filters
                  </Button>
                </>
              ) : (
                <>
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium">Nothing to flag</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This pass found no issues worth reporting.
                  </p>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------------------ verdict -- */}
      {run.done?.verdict ? (
        <>
          <Separator />
          <div className="bg-muted/20 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Verdict
            </p>
            <p className="mt-1 text-sm leading-relaxed">{run.done.verdict}</p>

            {run.done.topPriorities?.length ? (
              <ol className="mt-2.5 space-y-1">
                {run.done.topPriorities.map((priority, index) => (
                  <li key={priority} className="flex gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{index + 1}.</span>
                    {priority}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        </>
      ) : null}

      {/* usage footer — only meaningful for live runs */}
      {run.usage ? (
        <div className="border-t px-4 py-2">
          <Tooltip content="Cached tokens are billed at roughly a tenth of the input rate.">
            <p className="font-mono text-[10px] text-muted-foreground">
              {run.usage.input.toLocaleString()} in · {run.usage.output.toLocaleString()} out
              {run.usage.cacheRead ? ` · ${run.usage.cacheRead.toLocaleString()} cached` : ''}
            </p>
          </Tooltip>
        </div>
      ) : null}
    </div>
  );
}
