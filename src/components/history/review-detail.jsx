'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ArrowLeft, FileSearch, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/misc';
import { ScoreRing } from '@/components/review/score-ring';
import { FindingCard } from '@/components/review/finding-card';
import { ExportMenu } from '@/components/review/export-menu';
import { useHistoryStore } from '@/store/history-store';
import { useReviewStore } from '@/store/review-store';
import { useIsHydrated } from '@/hooks/use-is-hydrated';
import { sortFindings, countBySeverity } from '@/lib/scoring';
import { SEVERITIES, SEVERITY_ORDER } from '@/lib/constants';
import { pluralize, formatDuration } from '@/lib/utils';

export function ReviewDetail() {
  const { id } = useParams();
  const router = useRouter();

  const getById = useHistoryStore((s) => s.getById);
  const loadReview = useReviewStore((s) => s.loadReview);

  const mounted = useIsHydrated();

  if (!mounted) {
    return (
      <div className="container space-y-4 py-8">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const review = getById(id);

  if (!review) {
    return (
      <div className="container grid min-h-[60vh] place-items-center py-12">
        <div className="max-w-sm text-center">
          <FileSearch className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold">Review not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            It may have been deleted, or saved in a different browser.
          </p>
          <Button className="mt-6" variant="outline" asChild>
            <Link href="/history">
              <ArrowLeft />
              Back to history
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const findings = sortFindings(review.findings ?? []);
  const counts = countBySeverity(findings);

  const reopen = () => {
    loadReview(review);
    toast.success('Loaded into the workspace');
    router.push('/review');
  };

  return (
    <div className="container space-y-6 py-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/history">
          <ArrowLeft />
          History
        </Link>
      </Button>

      {/* ---------------------------------------------------------- header */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 p-6">
          <ScoreRing score={review.score} size={96} />

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight">{review.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {format(new Date(review.createdAt), 'PPpp')}
              {review.durationMs ? ` · ${formatDuration(review.durationMs)}` : ''}
              {review.model ? ` · ${review.model}` : ' · local engine'}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {SEVERITY_ORDER.filter((s) => counts[s] > 0).map((severity) => (
                <Badge key={severity} variant={severity}>
                  {counts[severity]} {SEVERITIES[severity].label.toLowerCase()}
                </Badge>
              ))}
              <Badge variant="outline">{pluralize(review.files?.length ?? 0, 'file')}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ExportMenu review={review} />
            <Button onClick={reopen}>Reopen in workspace</Button>
          </div>
        </CardContent>
      </Card>

      {/* --------------------------------------------------------- summary */}
      {review.summary?.overview ? (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Summary
            </h2>
            <p className="mt-2 leading-relaxed">{review.summary.overview}</p>

            {review.summary.strengths?.length ? (
              <ul className="mt-4 space-y-1.5">
                {review.summary.strengths.map((strength) => (
                  <li key={strength} className="flex gap-2 text-sm text-muted-foreground">
                    <Sparkles
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500"
                      aria-hidden="true"
                    />
                    {strength}
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* -------------------------------------------------------- findings */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {pluralize(findings.length, 'finding')}
        </h2>

        <div className="space-y-2">
          {findings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- verdict */}
      {review.done?.verdict ? (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Verdict
            </h2>
            <p className="mt-2 leading-relaxed">{review.done.verdict}</p>

            {review.done.topPriorities?.length ? (
              <ol className="mt-4 space-y-1.5">
                {review.done.topPriorities.map((priority, index) => (
                  <li key={priority} className="flex gap-2 text-sm">
                    <span className="font-semibold text-primary">{index + 1}.</span>
                    <span className="text-muted-foreground">{priority}</span>
                  </li>
                ))}
              </ol>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
