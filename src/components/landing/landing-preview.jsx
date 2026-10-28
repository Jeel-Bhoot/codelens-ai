'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, ShieldAlert, Zap, Accessibility, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Non-interactive hero animation. Replays the real streaming cadence — cards
 * appearing one at a time — so the landing page shows the actual product
 * behaviour rather than a static screenshot.
 */
const SCRIPT = [
  {
    icon: ShieldAlert,
    severity: 'critical',
    category: 'Security',
    title: 'dangerouslySetInnerHTML introduces an XSS surface',
    location: 'ProductList.jsx:71',
  },
  {
    icon: Accessibility,
    severity: 'high',
    category: 'Accessibility',
    title: 'Click handler on a non-interactive element',
    location: 'ProductList.jsx:64',
  },
  {
    icon: Zap,
    severity: 'high',
    category: 'Performance',
    title: 'useEffect with no dependency array',
    location: 'ProductList.jsx:27',
  },
  {
    icon: AlertTriangle,
    severity: 'medium',
    category: 'React',
    title: 'Event listener added without cleanup',
    location: 'ProductList.jsx:31',
  },
];

export function LandingPreview() {
  const reduceMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(0);

  // Derived, not stored: reduced motion shows the finished state outright
  // rather than writing the final count into state from an effect.
  const visible = reduceMotion ? SCRIPT.length : revealed;

  useEffect(() => {
    if (reduceMotion) return undefined;

    // setState inside a timer callback is asynchronous, so this schedules
    // renders rather than cascading them.
    const timers = SCRIPT.map((_, index) =>
      setTimeout(() => setRevealed(index + 1), 700 + index * 850)
    );
    return () => timers.forEach(clearTimeout);
  }, [reduceMotion]);

  const streaming = visible < SCRIPT.length;

  return (
    <div className="mx-auto mt-16 max-w-4xl">
      <div className="overflow-hidden rounded-xl border bg-card shadow-2xl shadow-primary/5">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-amber-500/70" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/70" />
          </span>
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            codelens — reviewing ProductList.jsx
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            {streaming ? (
              <>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                streaming
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                complete
              </>
            )}
          </span>
        </div>

        <div
          className="min-h-[300px] space-y-2.5 p-4 text-left"
          aria-live="polite"
          aria-atomic="false"
        >
          <p className="px-1 pb-2 font-mono text-xs text-muted-foreground">
            {streaming
              ? `Analysing 2 files… ${visible} finding${visible === 1 ? '' : 's'} so far`
              : `Analysis complete — ${SCRIPT.length} findings, score 61/100`}
          </p>

          {SCRIPT.slice(0, visible).map((item, index) => (
            <motion.div
              key={item.title}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: index === visible - 1 ? 0 : 0 }}
              className="flex items-start gap-3 rounded-lg border bg-background/60 p-3"
            >
              <span
                className={cn(
                  'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md',
                  item.severity === 'critical' && 'bg-severity-critical/10 text-severity-critical',
                  item.severity === 'high' && 'bg-severity-high/10 text-severity-high',
                  item.severity === 'medium' && 'bg-severity-medium/10 text-severity-medium'
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={item.severity}>{item.severity}</Badge>
                  <span className="text-xs text-muted-foreground">{item.category}</span>
                </div>
                <p className="mt-1.5 text-sm font-medium leading-snug">{item.title}</p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{item.location}</p>
              </div>
            </motion.div>
          ))}

          {streaming ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
              <span className="h-8 w-8 shrink-0 animate-pulse rounded-md bg-muted" />
              <div className="flex-1 space-y-2">
                <span className="block h-2.5 w-24 animate-pulse rounded bg-muted" />
                <span className="block h-2.5 w-2/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
