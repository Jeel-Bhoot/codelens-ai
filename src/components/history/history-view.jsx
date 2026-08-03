'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { History, Search, Trash2, ArrowRight, FileCode2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/misc';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ScoreRing } from '@/components/review/score-ring';
import { useHistoryStore } from '@/store/history-store';
import { useIsHydrated } from '@/hooks/use-is-hydrated';
import { SEVERITIES, SEVERITY_ORDER } from '@/lib/constants';
import { pluralize, formatDuration } from '@/lib/utils';

export function HistoryView() {
  const [query, setQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const reviews = useHistoryStore((s) => s.reviews);
  const remove = useHistoryStore((s) => s.remove);
  const clear = useHistoryStore((s) => s.clear);

  const mounted = useIsHydrated();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter(
      (review) =>
        review.title.toLowerCase().includes(q) ||
        review.findings?.some((f) => f.title.toLowerCase().includes(q))
    );
  }, [reviews, query]);

  if (!mounted) {
    return (
      <div className="container space-y-4 py-8">
        <Skeleton className="h-9 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (!reviews.length) {
    return (
      <div className="container grid min-h-[60vh] place-items-center py-12">
        <div className="max-w-sm text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
            <History className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">No history yet</h1>
          <p className="mt-2 text-muted-foreground">
            Reviews you run are saved here in this browser so you can compare scores over time.
          </p>
          <Button className="mt-6" asChild>
            <Link href="/review">
              Run a review
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container space-y-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review history</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pluralize(reviews.length, 'review')} saved in this browser
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search reviews…"
              className="w-56 pl-8"
              aria-label="Search review history"
            />
          </div>

          <Button variant="outline" size="icon" onClick={() => setConfirmClear(true)}>
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Clear all history</span>
          </Button>
        </div>
      </div>

      {!filtered.length ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Nothing matches “{query}”.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((review) => {
            const counts = SEVERITY_ORDER.map((severity) => ({
              severity,
              count: review.findings?.filter((f) => f.severity === severity).length ?? 0,
            })).filter((c) => c.count > 0);

            return (
              <li key={review.id}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex flex-wrap items-center gap-4 p-4">
                    <ScoreRing score={review.score} size={56} strokeWidth={5} showGrade={false} />

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/history/${review.id}`}
                        className="text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {review.title}
                      </Link>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                        {review.durationMs ? ` · ${formatDuration(review.durationMs)}` : ''}
                        {review.model ? ` · ${review.model}` : ' · local engine'}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FileCode2 className="h-3 w-3" aria-hidden="true" />
                          {pluralize(review.files?.length ?? 0, 'file')}
                        </span>
                        {counts.map(({ severity, count }) => (
                          <Badge key={severity} variant={severity} className="text-[10px]">
                            {count} {SEVERITIES[severity].label.toLowerCase()}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/history/${review.id}`}>Open</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="hover:text-destructive"
                        onClick={() => {
                          remove(review.id);
                          toast.success('Review deleted');
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete {review.title}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clear all history?</DialogTitle>
            <DialogDescription>
              This permanently deletes {pluralize(reviews.length, 'saved review')} from this
              browser. It cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                clear();
                setConfirmClear(false);
                toast.success('History cleared');
              }}
            >
              Delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
