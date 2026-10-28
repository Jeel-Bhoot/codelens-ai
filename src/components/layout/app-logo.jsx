import { useId } from 'react';
import { cn } from '@/lib/utils';

/** "AI" in an open rounded frame with sparkles, filled with the brand gradient. */
export function AppLogoMark({ className }) {
  // The logo renders more than once per page (desktop rail + mobile menu), and
  // a url(#id) pointing into a display:none copy paints nothing — so each
  // instance gets its own gradient id.
  const gradientId = useId();
  const paint = `url(#${gradientId})`;

  return (
    <svg viewBox="0 0 480 480" className={className} aria-hidden="true">
      <defs>
        <linearGradient
          id={gradientId}
          x1="60"
          y1="40"
          x2="420"
          y2="420"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="35%" stopColor="#6366F1" />
          <stop offset="65%" stopColor="#A855F7" />
          <stop offset="85%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      <path
        d="M215 122 H115 A45 45 0 0 0 70 167 V355 A45 45 0 0 0 115 400 H320 A45 45 0 0 0 365 355 V262"
        fill="none"
        stroke={paint}
        strokeWidth="24"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        fill={paint}
        fillRule="evenodd"
        d="M118 345 L161 205 L196 205 L239 345 L211 345 L201 313 L156 313 L146 345 Z
           M164 289 L193 289 L178.5 240 Z"
      />

      <rect x="256" y="205" width="27" height="140" fill={paint} />

      <path
        fill={paint}
        d="M362 98 Q370 157 425 165 Q370 173 362 232 Q354 173 299 165 Q354 157 362 98 Z"
      />
      <path
        fill={paint}
        d="M283 52 Q288 85 320 90 Q288 95 283 128 Q278 95 246 90 Q278 85 283 52 Z"
      />
      <path
        fill={paint}
        d="M398 24 Q402 50 428 55 Q402 60 398 86 Q394 60 368 55 Q394 50 398 24 Z"
      />
    </svg>
  );
}

/** Header wordmark: "CodeLens" followed by the AI mark standing in for "AI". */
export function AppLogo({ className }) {
  return (
    <span className={cn('flex items-center gap-1 text-lg font-semibold tracking-tight', className)}>
      CodeLens
      <AppLogoMark className="h-8 w-8 -translate-y-0.5" />
      <span className="sr-only"> AI</span>
    </span>
  );
}
