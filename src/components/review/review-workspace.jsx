'use client';

import { useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { FileManager } from '@/components/review/file-manager';
import { CodeEditor } from '@/components/review/code-editor';
import { ReviewPanel } from '@/components/review/review-panel';
import { ReviewControls } from '@/components/review/review-controls';
import { useReviewStream } from '@/hooks/use-review-stream';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useReviewStore } from '@/store/review-store';

export function ReviewWorkspace() {
  const { start, cancel } = useReviewStream();
  const status = useReviewStore((s) => s.run.status);
  const isRunning = ['analyzing', 'reasoning', 'reviewing'].includes(status);

  // One layout is rendered, not two. The previous `hidden lg:flex` / `lg:hidden`
  // pair kept both trees mounted, which meant every visitor loaded two Monaco
  // instances and only ever saw one of them.
  const isWide = useMediaQuery('(min-width: 1024px)', true);

  // ⌘↵ / Ctrl+↵ runs a review from anywhere in the workspace, including from
  // inside the editor — Monaco doesn't swallow it because this is a capture-
  // phase listener on the document.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (isRunning) cancel();
        else start();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [start, cancel, isRunning]);

  // The command palette fires this so "Run review" works from ⌘K.
  useEffect(() => {
    const onRun = () => {
      if (!isRunning) start();
    };
    document.addEventListener('codelens:run-review', onRun);
    return () => document.removeEventListener('codelens:run-review', onRun);
  }, [start, isRunning]);

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <ReviewControls onRun={start} onCancel={cancel} />

      {/* Stacked on small screens; side-by-side and resizable from lg up. */}
      <div className="min-h-0 flex-1">
        {isWide ? (
          <PanelGroup direction="horizontal" className="flex h-full">
            <Panel defaultSize={58} minSize={30}>
              <div className="flex h-full flex-col">
                <FileManager />
                <div className="min-h-0 flex-1">
                  <CodeEditor />
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="group relative w-px bg-border transition-colors hover:bg-primary/50 data-[resize-handle-state=drag]:bg-primary">
              {/* Wider invisible hit area — a 1px grab target is unusable. */}
              <span className="absolute inset-y-0 -left-1.5 -right-1.5" />
            </PanelResizeHandle>

            <Panel defaultSize={42} minSize={26}>
              <ReviewPanel />
            </Panel>
          </PanelGroup>
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex h-1/2 flex-col border-b">
              <FileManager />
              <div className="min-h-0 flex-1">
                <CodeEditor />
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <ReviewPanel />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
