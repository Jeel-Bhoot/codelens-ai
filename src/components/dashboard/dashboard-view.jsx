'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ScanSearch,
  FileCheck2,
  AlertOctagon,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/misc';
import { ScoreRing } from '@/components/review/score-ring';
import { TrendChart, CategoryChart, SeverityChart } from '@/components/dashboard/charts';
import { useHistoryStore } from '@/store/history-store';
import { useIsHydrated } from '@/hooks/use-is-hydrated';
import { SEVERITIES, SEVERITY_ORDER } from '@/lib/constants';
import { pluralize, cn } from '@/lib/utils';

export function DashboardView() {
  const reviews = useHistoryStore((s) => s.reviews);
  const stats = useHistoryStore((s) => s.stats);

  // History lives in localStorage, so the server render has nothing. Gating
  // on hydration avoids a mismatch on every number on this page.
  const hydrated = useIsHydrated();

  if (!hydrated) return <DashboardSkeleton />;

  const data = stats();

  if (!data.total) {
    return (
      <div className="container grid min-h-[60vh] place-items-center py-12">
        <div className="max-w-md text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
            <ScanSearch className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Welcome to Critiq</h1>
          <p className="mt-2 text-muted-foreground">
            Run your first review and this page fills up with your quality trend, findings breakdown
            and history.
          </p>
          <Button className="mt-6" asChild>
            <Link href="/review">
              Start a review
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const TrendIcon =
    data.scoreDelta > 0 ? ArrowUpRight : data.scoreDelta < 0 ? ArrowDownRight : Minus;

  return (
    <div className="container space-y-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pluralize(data.total, 'review')} · {pluralize(data.totalFindings, 'finding')} surfaced
          </p>
        </div>
        <Button asChild>
          <Link href="/review">
            New review
            <ArrowRight />
          </Link>
        </Button>
      </div>

      {/* ---------------------------------------------------------- stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <ScoreRing score={data.averageScore} size={64} strokeWidth={6} showGrade={false} />
            <div>
              <p className="text-xs text-muted-foreground">Average score</p>
              <p
                className={cn(
                  'mt-1 flex items-center gap-1 text-xs font-medium',
                  data.scoreDelta > 0 && 'text-emerald-500',
                  data.scoreDelta < 0 && 'text-red-500',
                  data.scoreDelta === 0 && 'text-muted-foreground'
                )}
              >
                <TrendIcon className="h-3 w-3" aria-hidden="true" />
                {data.scoreDelta === 0
                  ? 'Holding steady'
                  : `${Math.abs(data.scoreDelta)} pts vs earlier`}
              </p>
            </div>
          </CardContent>
        </Card>

        <StatCard
          icon={FileCheck2}
          label="Reviews run"
          value={data.total}
          hint="Stored in this browser"
        />
        <StatCard
          icon={Gauge}
          label="Findings"
          value={data.totalFindings}
          hint={`${(data.totalFindings / data.total).toFixed(1)} per review`}
        />
        <StatCard
          icon={AlertOctagon}
          label="Critical"
          value={data.criticalOpen}
          hint={data.criticalOpen ? 'Fix these first' : 'None outstanding'}
          tone={data.criticalOpen ? 'text-severity-critical' : undefined}
        />
      </div>

      {/* --------------------------------------------------------- charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Score over time</CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            <TrendChart data={data.trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryChart data={data.byCategory} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By severity</CardTitle>
          </CardHeader>
          <CardContent>
            <SeverityChart data={data.bySeverity} />
          </CardContent>
        </Card>

        {/* ------------------------------------------------------- recent */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent reviews</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/history">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {reviews.slice(0, 5).map((review) => {
                const worst = SEVERITY_ORDER.find((s) =>
                  review.findings?.some((f) => f.severity === s)
                );

                return (
                  <li key={review.id}>
                    <Link
                      href={`/history/${review.id}`}
                      className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <ScoreRing score={review.score} size={38} strokeWidth={4} showGrade={false} />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{review.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })} ·{' '}
                          {pluralize(review.findings?.length ?? 0, 'finding')}
                        </p>
                      </div>

                      {worst ? (
                        <Badge variant={worst} className="shrink-0 text-[10px]">
                          {SEVERITIES[worst].label}
                        </Badge>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, tone }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Icon className={cn('h-4 w-4 text-muted-foreground', tone)} aria-hidden="true" />
        </div>
        <p className={cn('mt-2 text-2xl font-bold tabular-nums', tone)}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container space-y-6 py-8">
      <Skeleton className="h-9 w-52" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
