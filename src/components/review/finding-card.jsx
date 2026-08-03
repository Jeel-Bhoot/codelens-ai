'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  ChevronDown,
  Zap,
  Accessibility,
  Component,
  ShieldAlert,
  Wrench,
  Bug,
  Wand2,
  Copy,
  CircleDot,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/misc';
import { useReviewStore } from '@/store/review-store';
import { CATEGORIES } from '@/lib/constants';
import { cn, copyToClipboard } from '@/lib/utils';

// The diff viewer pulls in its own diffing engine — only load it when a card
// with a suggested fix is actually expanded.
const DiffViewer = dynamic(() => import('react-diff-viewer-continued'), {
  ssr: false,
  loading: () => <div className="h-24 animate-pulse rounded-md bg-muted" />,
});

const CATEGORY_ICONS = {
  performance: Zap,
  accessibility: Accessibility,
  'best-practices': Component,
  security: ShieldAlert,
  maintainability: Wrench,
  types: Bug,
};

const CONFIDENCE_COPY = {
  high: 'High confidence — this is almost certainly a real issue.',
  medium: 'Medium confidence — worth verifying against your intent.',
  low: 'Low confidence — heuristic match, may be a false positive.',
};

export function FindingCard({ finding, isFocused }) {
  const [expanded, setExpanded] = useState(false);
  const { resolvedTheme } = useTheme();

  const focusFinding = useReviewStore((s) => s.focusFinding);
  const applyFix = useReviewStore((s) => s.applyFix);

  const Icon = CATEGORY_ICONS[finding.category] ?? Bug;
  const category = CATEGORIES[finding.category];
  const hasFix = Boolean(finding.codeBefore && finding.codeAfter);

  const handleApply = () => {
    if (applyFix(finding)) {
      toast.success('Fix applied to the editor', {
        description: 'Re-run the review to confirm it resolved the finding.',
      });
    } else {
      toast.error('Could not apply automatically', {
        description: 'The surrounding code has changed since this finding was written.',
      });
    }
  };

  return (
    <article
      id={`finding-${finding.id}`}
      className={cn(
        'animate-fade-up rounded-lg border bg-card transition-colors',
        isFocused ? 'border-primary ring-1 ring-primary' : 'hover:border-muted-foreground/30'
      )}
    >
      {/* ------------------------------------------------------- header -- */}
      <button
        type="button"
        onClick={() => {
          setExpanded((v) => !v);
          focusFinding(finding.id);
        }}
        aria-expanded={expanded}
        aria-controls={`finding-body-${finding.id}`}
        className="flex w-full items-start gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        {/* Severity colour comes from an inline style, not a class: Tailwind
            only ships classes it can see at build time, so `bg-severity-${x}`
            would compile to nothing. The CSS variables are the shared source. */}
        <span
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md"
          style={{
            backgroundColor: `hsl(var(--severity-${finding.severity}) / 0.12)`,
            color: `hsl(var(--severity-${finding.severity}))`,
          }}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={finding.severity}>{finding.severity}</Badge>
            <span className="text-xs text-muted-foreground">{category?.label}</span>

            {finding.source === 'static' ? (
              <Tooltip content="Found by the local rule engine, before the model responded">
                <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  local
                </span>
              </Tooltip>
            ) : null}

            {finding.confidence !== 'high' ? (
              <Tooltip content={CONFIDENCE_COPY[finding.confidence]}>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <CircleDot className="h-2.5 w-2.5" aria-hidden="true" />
                  {finding.confidence}
                </span>
              </Tooltip>
            ) : null}
          </div>

          <h3 className="mt-1.5 text-sm font-medium leading-snug">{finding.title}</h3>

          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {finding.file}
            {finding.line ? `:${finding.line}` : ''}
          </p>
        </div>

        <ChevronDown
          className={cn(
            'mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {/* --------------------------------------------------------- body -- */}
      {expanded ? (
        <div id={`finding-body-${finding.id}`} className="space-y-4 border-t px-3 pb-4 pt-3">
          <Section title="What's wrong">{finding.description}</Section>
          {finding.impact ? <Section title="Why it matters">{finding.impact}</Section> : null}
          {finding.suggestion ? <Section title="How to fix">{finding.suggestion}</Section> : null}

          {hasFix ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Suggested change
                </h4>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      copyToClipboard(finding.codeAfter);
                      toast.success('Copied the fixed code');
                    }}
                  >
                    <Copy />
                    Copy
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleApply}>
                    <Wand2 />
                    Apply fix
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-md border text-xs">
                <DiffViewer
                  oldValue={finding.codeBefore}
                  newValue={finding.codeAfter}
                  splitView={false}
                  hideLineNumbers
                  useDarkTheme={resolvedTheme === 'dark'}
                  styles={{
                    variables: {
                      dark: { diffViewerBackground: 'transparent' },
                      light: { diffViewerBackground: 'transparent' },
                    },
                    contentText: { fontFamily: 'var(--font-mono), monospace', fontSize: '12px' },
                  }}
                />
              </div>
            </div>
          ) : finding.codeBefore ? (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Relevant code
              </h4>
              <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs">
                <code>{finding.codeBefore}</code>
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <p className="mt-1 text-sm leading-relaxed">{children}</p>
    </div>
  );
}
