'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useReviewStore } from '@/store/review-store';
import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES, MAX_FILES } from '@/lib/constants';
import { formatBytes } from '@/lib/utils';

const isAccepted = (name) => ACCEPTED_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));

/**
 * Handles drop, picker and paste. Zip archives are unpacked in the browser —
 * JSZip is imported lazily so the ~100KB parser only loads for users who
 * actually drop an archive.
 */
export function useFileUpload() {
  const addFile = useReviewStore((s) => s.addFile);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const ingest = useCallback(
    async (fileList) => {
      const files = Array.from(fileList ?? []);
      if (!files.length) return;

      setIsProcessing(true);

      let added = 0;
      const skipped = [];

      try {
        for (const file of files) {
          if (file.name.toLowerCase().endsWith('.zip')) {
            const result = await ingestZip(file, addFile);
            added += result.added;
            skipped.push(...result.skipped);
            continue;
          }

          if (!isAccepted(file.name)) {
            skipped.push(`${file.name} — unsupported type`);
            continue;
          }

          if (file.size > MAX_FILE_BYTES) {
            skipped.push(`${file.name} — ${formatBytes(file.size)} exceeds the per-file limit`);
            continue;
          }

          const content = await file.text();
          const outcome = addFile({ name: file.name, content });

          if (outcome.ok) added += 1;
          else skipped.push(`${file.name} — ${outcome.error}`);
        }

        if (added) {
          toast.success(`Added ${added} file${added === 1 ? '' : 's'}`);
        }

        if (skipped.length) {
          toast.warning(`Skipped ${skipped.length} file${skipped.length === 1 ? '' : 's'}`, {
            description: skipped.slice(0, 3).join('\n'),
          });
        }
      } catch (error) {
        toast.error('Could not read those files', { description: error.message });
      } finally {
        setIsProcessing(false);
      }
    },
    [addFile]
  );

  const dragHandlers = {
    onDragOver: (event) => {
      event.preventDefault();
      setIsDragging(true);
    },
    onDragLeave: (event) => {
      // Only clear when the pointer actually leaves the drop zone, not when
      // it moves between children.
      if (event.currentTarget.contains(event.relatedTarget)) return;
      setIsDragging(false);
    },
    onDrop: (event) => {
      event.preventDefault();
      setIsDragging(false);
      ingest(event.dataTransfer.files);
    },
  };

  return { ingest, isDragging, isProcessing, dragHandlers };
}

async function ingestZip(zipFile, addFile) {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(zipFile);

  const entries = Object.values(zip.files).filter(
    (entry) =>
      !entry.dir &&
      isAccepted(entry.name) &&
      // Skip vendored and build output — nobody wants a review of lodash.
      !/node_modules|\.next|dist\/|build\/|\.min\./.test(entry.name)
  );

  let added = 0;
  const skipped = [];

  for (const entry of entries.slice(0, MAX_FILES)) {
    const content = await entry.async('string');

    if (new Blob([content]).size > MAX_FILE_BYTES) {
      skipped.push(`${entry.name} — too large`);
      continue;
    }

    // Flatten paths: the store keys on name, and the reviewer only needs
    // the leaf to cite locations.
    const name = entry.name.split('/').pop();
    const outcome = addFile({ name, content });

    if (outcome.ok) added += 1;
    else skipped.push(`${name} — ${outcome.error}`);
  }

  if (entries.length > MAX_FILES) {
    skipped.push(`${entries.length - MAX_FILES} more files beyond the ${MAX_FILES}-file limit`);
  }

  return { added, skipped };
}
