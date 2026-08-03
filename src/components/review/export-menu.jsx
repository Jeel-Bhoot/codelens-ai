'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Download, FileText, FileJson, FileArchive, FileType2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useReviewStore } from '@/store/review-store';
import { useSettingsStore } from '@/store/settings-store';
import { computeScore } from '@/lib/scoring';
import { exportPdf, exportJson, exportMarkdown, exportZip } from '@/lib/export/report';

export function ExportMenu({ review: providedReview }) {
  const [busy, setBusy] = useState(false);

  const store = useReviewStore;
  const profile = useSettingsStore((s) => s.profile);

  /** History passes a saved review; the workspace builds one from live state. */
  const buildReview = () => {
    if (providedReview) return providedReview;

    const state = store.getState();
    return {
      title: state.files[0]?.name ?? 'Review',
      createdAt: new Date().toISOString(),
      score: computeScore(state.run.findings, state.totalLines()),
      mode: state.run.mode,
      model: state.run.model,
      profile,
      files: state.files,
      findings: state.run.findings,
      summary: state.run.summary,
      done: state.run.done,
    };
  };

  const handle = async (label, exporter) => {
    setBusy(true);
    try {
      await exporter(buildReview());
      toast.success(`${label} exported`);
    } catch (error) {
      toast.error(`Could not export ${label}`, { description: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" loading={busy}>
          <Download />
          Export
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export this review</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => handle('PDF report', exportPdf)}>
          <FileText />
          PDF report
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={() => handle('Markdown', exportMarkdown)}>
          <FileType2 />
          Markdown
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={() => handle('JSON', exportJson)}>
          <FileJson />
          JSON (for CI)
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => handle('archive', exportZip)}>
          <FileArchive />
          Zip — report + source
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
