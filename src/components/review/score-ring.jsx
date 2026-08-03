'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { scoreGrade } from '@/lib/scoring';
import { cn } from '@/lib/utils';

/**
 * Animated score dial. Pure SVG — no chart library needed for one arc, and it
 * keeps the component tree light enough to render inside a list row.
 */
export function ScoreRing({ score = 0, size = 96, strokeWidth = 8, showGrade = true, className }) {
  const reduceMotion = useReducedMotion();
  const [animated, setAnimated] = useState(0);

  // Derived rather than stored: with reduced motion there is no animation to
  // run, so the final value is used directly instead of being written into
  // state from an effect.
  const displayed = reduceMotion ? score : animated;

  useEffect(() => {
    if (reduceMotion) return undefined;

    // Ease-out count-up: fast at the start, settling on the final value.
    let frame;
    const start = performance.now();
    const duration = 850;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setAnimated(Math.round(score * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score, reduceMotion]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayed / 100) * circumference;
  const { grade, label, tone } = scoreGrade(score);

  const stroke =
    score >= 90
      ? 'hsl(152 76% 40%)'
      : score >= 80
        ? 'hsl(84 70% 45%)'
        : score >= 70
          ? 'hsl(38 92% 50%)'
          : score >= 55
            ? 'hsl(25 95% 53%)'
            : 'hsl(0 72% 51%)';

  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          role="img"
          aria-label={`Quality score ${score} out of 100, grade ${grade}, ${label}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: reduceMotion ? 'none' : 'stroke-dashoffset 80ms linear' }}
          />
        </svg>

        <div className="absolute inset-0 grid place-items-center">
          <span
            className="font-bold tabular-nums leading-none"
            style={{ fontSize: size * 0.28 }}
            aria-hidden="true"
          >
            {displayed}
          </span>
        </div>
      </div>

      {showGrade ? (
        <p className={cn('mt-2 text-xs font-medium', tone)} aria-hidden="true">
          {grade} · {label}
        </p>
      ) : null}
    </div>
  );
}
