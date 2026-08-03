'use client';

import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/misc';

/**
 * Session state is not here: Auth.js owns it, and `(app)/layout.js` supplies
 * it server-side via SessionProvider. There is nothing to sync from a cookie
 * on the client any more, and no second source of truth to drift.
 */
export function AppProviders({ children }) {
  // Created inside state so each browser session gets exactly one client,
  // and it is never shared across requests during SSR.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={250}>
          {children}
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{ classNames: { toast: 'font-sans' } }}
          />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
