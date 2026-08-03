import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        critical: 'border-severity-critical/30 bg-severity-critical/10 text-severity-critical',
        high: 'border-severity-high/30 bg-severity-high/10 text-severity-high',
        medium: 'border-severity-medium/30 bg-severity-medium/10 text-severity-medium',
        low: 'border-severity-low/30 bg-severity-low/10 text-severity-low',
        info: 'border-severity-info/30 bg-severity-info/10 text-severity-info',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
