'use client';

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useReviewStore } from '@/store/review-store';
import { useSettingsStore } from '@/store/settings-store';
import { useHistoryStore } from '@/store/history-store';
import { runStaticAnalysis } from '@/lib/analysis/static-rules';
import { createNdjsonReader, readSseStream } from '@/lib/ai/stream';
import { computeScore } from '@/lib/scoring';
import { uid } from '@/lib/utils';

/**
 * Drives one review from click to saved result.
 *
 * The order of operations here is the interesting part:
 *
 *   1. Run the local rule engine synchronously and paint those findings
 *      immediately — the panel is never empty while the network is in flight.
 *   2. Open the SSE stream. Reasoning tokens go to the thinking panel.
 *   3. Review tokens are fed through an NDJSON reader that emits each finding
 *      the instant its line closes, so cards appear one at a time rather than
 *      all at once at the end.
 *   4. On completion, score the result and write it to history.
 *
 * Cancellation aborts the fetch, which closes the response body, which the
 * route handler observes and uses to abort the upstream model request — so a
 * cancelled review stops costing money immediately.
 */
export function useReviewStream() {
  const abortRef = useRef(null);

  const store = useReviewStore;
  const saveToHistory = useHistoryStore((s) => s.save);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    store.getState().cancelRun();
    toast.info('Review cancelled');
  }, [store]);

  const start = useCallback(async () => {
    const { files, beginRun } = store.getState();

    if (!files.length) {
      toast.error('Add at least one file to review');
      return;
    }

    const settings = useSettingsStore.getState();

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    beginRun();

    // 1. Instant local pass — no await, no network.
    if (settings.showStaticFindings) {
      const staticFindings = runStaticAnalysis(
        files.map((f) => ({ name: f.name, content: f.content }))
      );
      store.getState().seedStaticFindings(staticFindings);
    }

    // The NDJSON reader turns a token stream into discrete records.
    const reader = createNdjsonReader((record) => {
      const state = store.getState();
      if (record.type === 'finding') state.addFinding(record);
      else if (record.type === 'summary') state.setSummary(record);
      else if (record.type === 'done') state.setDone(record);
    });

    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          files: files.map((f) => ({ name: f.name, content: f.content })),
          profile: settings.profile,
          focus: settings.focus,
          notes: settings.notes,
          apiKey: settings.apiKey || undefined,
          model: settings.model || undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = body.error || `Review failed (${response.status})`;
        store.getState().failRun(message);
        toast.error(message, {
          description: body.issues?.map((i) => i.message).join(', '),
        });
        return;
      }

      await readSseStream(response, {
        start: ({ mode, provider, model }) =>
          store.getState().setRunMeta({ mode, provider, model }),

        status: ({ phase }) => store.getState().setRunStatus(phase),

        reasoning: ({ text }) => store.getState().appendReasoning(text),

        // Live mode: raw NDJSON tokens from the model.
        token: ({ text }) => reader.push(text),

        // Demo mode: records arrive already parsed.
        record: (record) => {
          const state = store.getState();
          if (record.type === 'finding') state.addFinding(record);
          else if (record.type === 'summary') state.setSummary(record);
          else if (record.type === 'done') state.setDone(record);
        },

        warning: ({ message }) => {
          store.getState().setWarning(message);
          toast.warning(message);
        },

        error: ({ message, recoverable }) => {
          store.getState().failRun(message);
          toast.error(message, {
            description: recoverable ? 'This one is usually worth retrying.' : undefined,
          });
        },

        complete: (payload) => {
          reader.flush();
          store.getState().finishRun({ usage: payload.usage ?? null, mode: payload.mode });
        },
      });

      // Guard against a stream that ends without a `complete` frame.
      reader.flush();

      const state = store.getState();
      if (state.run.status !== 'complete' && state.run.status !== 'error') {
        state.finishRun();
      }

      if (state.run.status === 'error') return;

      // 4. Score and persist.
      const finished = store.getState();
      const score = computeScore(finished.run.findings, finished.totalLines());

      const review = {
        id: uid('rev'),
        title: finished.files[0]?.name ?? 'Untitled review',
        createdAt: new Date().toISOString(),
        durationMs:
          (finished.run.finishedAt ?? Date.now()) - (finished.run.startedAt ?? Date.now()),
        mode: finished.run.mode,
        model: finished.run.model,
        profile: settings.profile,
        score,
        files: finished.files.map((f) => ({ id: f.id, name: f.name, content: f.content })),
        findings: finished.run.findings,
        summary: finished.run.summary,
        done: finished.run.done,
        usage: finished.run.usage,
      };

      saveToHistory(review);

      toast.success(`Review complete — score ${score}/100`, {
        description: `${finished.run.findings.length} finding${
          finished.run.findings.length === 1 ? '' : 's'
        } across ${finished.files.length} file${finished.files.length === 1 ? '' : 's'}`,
      });
    } catch (error) {
      if (error.name === 'AbortError') return; // user-initiated, already handled
      const message = error.message || 'The review stream failed unexpectedly.';
      store.getState().failRun(message);
      toast.error(message);
    } finally {
      abortRef.current = null;
    }
  }, [store, saveToHistory]);

  return { start, cancel };
}
