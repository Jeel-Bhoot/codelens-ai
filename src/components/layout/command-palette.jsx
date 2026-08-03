'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  ScanSearch,
  History,
  Settings,
  Sun,
  Moon,
  Play,
  Trash2,
  FileStack,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useReviewStore } from '@/store/review-store';

/**
 * ⌘K palette. Registered once in the app shell; every action here is also
 * reachable through the UI, so this is an accelerator rather than the only
 * path to anything.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  const loadSamples = useReviewStore((s) => s.loadSamples);
  const clearFiles = useReviewStore((s) => s.clearFiles);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    // Bound on `document` so the header's synthetic event reaches it too.
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const run = (action) => {
    setOpen(false);
    // Defer so the dialog's close animation and focus restore finish first.
    requestAnimationFrame(action);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0" hideClose>
        <DialogTitle className="sr-only">Command palette</DialogTitle>

        <Command
          loop
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
        >
          <Command.Input
            placeholder="Type a command or search…"
            className="h-12 w-full border-b bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
          />

          <Command.List className="scrollbar-thin max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No matching command.
            </Command.Empty>

            <Command.Group heading="Navigate">
              <Item icon={LayoutDashboard} onSelect={() => run(() => router.push('/dashboard'))}>
                Dashboard
              </Item>
              <Item icon={ScanSearch} onSelect={() => run(() => router.push('/review'))}>
                Review workspace
              </Item>
              <Item icon={History} onSelect={() => run(() => router.push('/history'))}>
                Review history
              </Item>
              <Item icon={Settings} onSelect={() => run(() => router.push('/settings'))}>
                Settings
              </Item>
            </Command.Group>

            <Command.Group heading="Workspace">
              <Item
                icon={Play}
                onSelect={() =>
                  run(() => {
                    router.push('/review');
                    // The workspace listens for this and starts a run.
                    setTimeout(
                      () => document.dispatchEvent(new CustomEvent('critiq:run-review')),
                      160
                    );
                  })
                }
              >
                Run review
              </Item>
              <Item icon={FileStack} onSelect={() => run(loadSamples)}>
                Load sample files
              </Item>
              <Item icon={Trash2} onSelect={() => run(clearFiles)}>
                Clear all files
              </Item>
            </Command.Group>

            <Command.Group heading="Appearance">
              <Item icon={Sun} onSelect={() => run(() => setTheme('light'))}>
                Light theme
              </Item>
              <Item icon={Moon} onSelect={() => run(() => setTheme('dark'))}>
                Dark theme
              </Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function Item({ icon: Icon, children, onSelect }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
    >
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      {children}
    </Command.Item>
  );
}
