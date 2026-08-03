import { AppShell } from '@/components/layout/app-shell';

/**
 * No session to resolve. Every route below is open, because there is nothing
 * here that belongs to anyone: reviews, history and settings all live in the
 * visitor's own browser. A login would have gated your data from you.
 */
export default function AppLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
