'use client';

import { useMemo, useRef } from 'react';
import { Plus, Upload, X, FileCode2, FileStack, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/misc';
import { useReviewStore } from '@/store/review-store';
import { useFileUpload } from '@/hooks/use-file-upload';
import { ACCEPTED_EXTENSIONS } from '@/lib/constants';
import { EMPTY_FILE } from '@/lib/samples';
import { cn } from '@/lib/utils';

export function FileManager() {
  const inputRef = useRef(null);

  const files = useReviewStore((s) => s.files);
  const activeFileId = useReviewStore((s) => s.activeFileId);
  const setActiveFile = useReviewStore((s) => s.setActiveFile);
  const removeFile = useReviewStore((s) => s.removeFile);
  const addFile = useReviewStore((s) => s.addFile);
  const loadSamples = useReviewStore((s) => s.loadSamples);
  const clearFiles = useReviewStore((s) => s.clearFiles);

  const { ingest, isDragging, isProcessing, dragHandlers } = useFileUpload();

  // Select the array — never derive inside the selector. A zustand selector is
  // the `getSnapshot` of a `useSyncExternalStore`, so it must return a stable
  // reference; building an object there returns a new one on every read and
  // React treats that as an unsettled store ("getServerSnapshot should be
  // cached to avoid an infinite loop"). Derive during render instead.
  const findings = useReviewStore((s) => s.run.findings);

  const findingsByFile = useMemo(() => {
    const counts = {};
    findings.forEach((f) => {
      counts[f.file] = (counts[f.file] || 0) + 1;
    });
    return counts;
  }, [findings]);

  return (
    <div
      {...dragHandlers}
      className={cn(
        'relative flex items-center gap-1 border-b bg-muted/20 px-2 py-1.5 transition-colors',
        isDragging && 'bg-primary/5 ring-1 ring-inset ring-primary'
      )}
    >
      {/* File tabs — a tablist so arrow keys move between them. */}
      <div
        role="tablist"
        aria-label="Open files"
        className="scrollbar-thin flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
      >
        {files.map((file) => {
          const isActive = file.id === activeFileId;
          const count = findingsByFile[file.name] ?? 0;

          return (
            <div
              key={file.id}
              className={cn(
                'group flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors',
                isActive
                  ? 'border-primary/40 bg-background font-medium'
                  : 'border-transparent text-muted-foreground hover:bg-accent'
              )}
            >
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFile(file.id)}
                className="flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <FileCode2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="max-w-[160px] truncate">{file.name}</span>
                {count ? (
                  <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums">
                    {count}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="rounded opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-60"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}

        {!files.length ? (
          <p className="px-2 text-xs text-muted-foreground">
            Drop files here, or add one to get started
          </p>
        ) : null}
      </div>

      {/* actions */}
      <div className="flex shrink-0 items-center gap-0.5">
        <Tooltip content="New empty file">
          <Button variant="ghost" size="icon-sm" onClick={() => addFile(EMPTY_FILE)}>
            <Plus className="h-4 w-4" />
            <span className="sr-only">Add a new file</span>
          </Button>
        </Tooltip>

        <Tooltip content="Upload files or a .zip">
          <Button
            variant="ghost"
            size="icon-sm"
            loading={isProcessing}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            <span className="sr-only">Upload files</span>
          </Button>
        </Tooltip>

        <Tooltip content="Load the sample project">
          <Button variant="ghost" size="icon-sm" onClick={loadSamples}>
            <FileStack className="h-4 w-4" />
            <span className="sr-only">Load sample files</span>
          </Button>
        </Tooltip>

        <Tooltip content="Clear the workspace">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={clearFiles}
            disabled={!files.length}
            className="hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Clear all files</span>
          </Button>
        </Tooltip>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          accept={[...ACCEPTED_EXTENSIONS, '.zip'].join(',')}
          onChange={(event) => {
            ingest(event.target.files);
            // Reset so re-selecting the same file fires change again.
            event.target.value = '';
          }}
        />
      </div>

      {isDragging ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/85 text-sm font-medium">
          Drop to add files
        </div>
      ) : null}
    </div>
  );
}
