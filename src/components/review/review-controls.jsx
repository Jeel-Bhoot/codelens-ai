'use client';

import { Play, Square, RotateCcw, Sparkles, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent, Checkbox, Tooltip } from '@/components/ui/misc';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { useSettingsStore } from '@/store/settings-store';
import { useReviewStore } from '@/store/review-store';
import { REVIEW_PROFILES, CATEGORIES } from '@/lib/constants';
import { PROVIDER_LABELS } from '@/lib/ai/providers/detect';
import { ExportMenu } from '@/components/review/export-menu';

export function ReviewControls({ onRun, onCancel }) {
  const profile = useSettingsStore((s) => s.profile);
  const setProfile = useSettingsStore((s) => s.setProfile);
  const focus = useSettingsStore((s) => s.focus);
  const toggleFocus = useSettingsStore((s) => s.toggleFocus);
  const notes = useSettingsStore((s) => s.notes);
  const setNotes = useSettingsStore((s) => s.setNotes);
  const apiKey = useSettingsStore((s) => s.apiKey);

  const status = useReviewStore((s) => s.run.status);
  const mode = useReviewStore((s) => s.run.mode);
  const provider = useReviewStore((s) => s.run.provider);
  const model = useReviewStore((s) => s.run.model);
  const fileCount = useReviewStore((s) => s.files.length);
  const resetRun = useReviewStore((s) => s.resetRun);

  const isRunning = ['analyzing', 'reasoning', 'reviewing'].includes(status);
  const isDone = status === 'complete';

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-card/40 px-4 py-2.5">
      {/* depth */}
      <Select value={profile} onValueChange={setProfile} disabled={isRunning}>
        <SelectTrigger className="h-8 w-[168px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(REVIEW_PROFILES).map(([key, config]) => (
            <SelectItem key={key} value={key}>
              <span className="font-medium">{config.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* focus areas */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" disabled={isRunning}>
            Focus
            {focus.length ? (
              <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px]">
                {focus.length}
              </Badge>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <p className="text-sm font-medium">Weight these areas more heavily</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Every category is still reviewed — this only shifts emphasis.
          </p>

          <div className="mt-3 space-y-2.5">
            {Object.entries(CATEGORIES).map(([key, category]) => (
              <div key={key} className="flex items-start gap-2.5">
                <Checkbox
                  id={`focus-${key}`}
                  checked={focus.includes(key)}
                  onCheckedChange={() => toggleFocus(key)}
                />
                <Label htmlFor={`focus-${key}`} className="text-sm font-normal leading-snug">
                  {category.label}
                </Label>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="review-notes" className="text-xs">
              Context for the reviewer
            </Label>
            <Textarea
              id="review-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. this runs in a Chrome extension, so no SSR"
              className="text-xs"
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* mode indicator */}
      {mode ? (
        <Tooltip
          content={
            mode === 'demo'
              ? 'Running the local analysis engine — no API key configured.'
              : // Named from the server's own report. Hardcoding a provider
                // here meant the badge claimed Claude while Gemini answered.
                `Streaming live from ${model ?? 'the configured model'}${
                  PROVIDER_LABELS[provider] ? ` — ${PROVIDER_LABELS[provider]}` : ''
                }.`
          }
        >
          <Badge variant={mode === 'demo' ? 'outline' : 'secondary'} className="gap-1">
            {mode === 'demo' ? (
              <Sparkles className="h-3 w-3" aria-hidden="true" />
            ) : (
              <KeyRound className="h-3 w-3" aria-hidden="true" />
            )}
            {mode === 'demo' ? 'Demo mode' : 'Live'}
          </Badge>
        </Tooltip>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        {isDone ? <ExportMenu /> : null}

        {isDone ? (
          <Button variant="ghost" size="sm" onClick={resetRun}>
            <RotateCcw />
            Clear
          </Button>
        ) : null}

        {isRunning ? (
          <Button variant="destructive" size="sm" onClick={onCancel}>
            <Square />
            Stop
          </Button>
        ) : (
          <Tooltip content="⌘ + Enter">
            <Button size="sm" onClick={onRun} disabled={!fileCount}>
              <Play />
              Review {fileCount ? `${fileCount} file${fileCount === 1 ? '' : 's'}` : ''}
            </Button>
          </Tooltip>
        )}
      </div>

      {!apiKey && mode === null ? (
        <p className="w-full text-[11px] text-muted-foreground">
          No API key set — reviews run against the local engine. Add a free Google AI Studio key in
          Settings for a real model.
        </p>
      ) : null}
    </div>
  );
}
