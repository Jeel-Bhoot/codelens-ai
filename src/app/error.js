'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Route-level error boundary. Catches render and data errors in the segment
 * below it so a single broken component never blanks the whole app.
 */
export default function Error({ error, reset }) {
  useEffect(() => {
    // In production this is where a Sentry / OTel call would go.
    console.error('Route error boundary caught:', error);
  }, [error]);

  return (
    <main id="main" className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </span>

        <h1 className="mt-6 text-2xl font-bold tracking-tight">Something broke</h1>
        <p className="mt-2 text-muted-foreground">
          An unexpected error stopped this page from rendering. Retrying re-mounts the segment
          without a full reload.
        </p>

        {error?.digest ? (
          <p className="mt-4 font-mono text-xs text-muted-foreground">Digest: {error.digest}</p>
        ) : null}

        <Button className="mt-8" onClick={reset}>
          <RotateCcw />
          Try again
        </Button>
      </div>
    </main>
  );
}
