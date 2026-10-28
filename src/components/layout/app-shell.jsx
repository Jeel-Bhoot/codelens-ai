'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ScanSearch,
  History,
  Settings,
  Menu,
  X,
  Command as CommandIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { CommandPalette } from '@/components/layout/command-palette';
import { AppLogo } from '@/components/layout/app-logo';
import { APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/review', label: 'Review', icon: ScanSearch },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);

  const navLinks = (
    <ul className="space-y-1">
      {NAV.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={() => setMobileOpen(false)}
            aria-current={isActive(item.href) ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive(item.href)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex min-h-dvh">
      <CommandPalette />

      {/* -------------------------------------------------- desktop rail */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card/40 lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/" aria-label={APP_NAME}>
            <AppLogo />
          </Link>
        </div>

        <nav className="flex-1 px-3 py-2" aria-label="Application sections">
          {navLinks}
        </nav>

        <div className="p-3">
          <div className="rounded-lg border bg-background/60 p-3">
            <p className="text-xs font-medium">Keyboard shortcuts</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
              command palette
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘↵</kbd>
              run review
            </p>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------ mobile nav */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
          />
          <div className="relative h-full w-64 animate-fade-up border-r bg-card p-4">
            <div className="mb-6 flex items-center justify-between">
              <AppLogo />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav aria-label="Application sections">{navLinks}</nav>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------------ main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-lg sm:px-6">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="hidden text-muted-foreground sm:inline-flex"
            onClick={() =>
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
            }
          >
            <CommandIcon className="h-3.5 w-3.5" />
            Search…
            <kbd className="ml-2 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />

            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Settings</span>
              </Link>
            </Button>
          </div>
        </header>

        <Separator />

        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
