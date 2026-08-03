'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { uid } from '@/lib/utils';
import { STORAGE_KEYS, MAX_FILES } from '@/lib/constants';
import { SAMPLE_FILES } from '@/lib/samples';

const emptyRun = () => ({
  /** idle | analyzing | reasoning | reviewing | complete | error | cancelled */
  status: 'idle',
  mode: null,
  /** 'anthropic' | 'gemini' | 'local' — reported by the server, never assumed. */
  provider: null,
  model: null,
  reasoning: '',
  findings: [],
  summary: null,
  done: null,
  error: null,
  warning: null,
  usage: null,
  startedAt: null,
  finishedAt: null,
});

export const useReviewStore = create()(
  persist(
    (set, get) => ({
      files: SAMPLE_FILES,
      activeFileId: SAMPLE_FILES[0].id,
      run: emptyRun(),
      /** Finding the editor should reveal, set by clicking a finding card. */
      focusedFindingId: null,

      /* --------------------------------------------------------- files -- */

      addFile({ name, content }) {
        const { files } = get();
        if (files.length >= MAX_FILES) {
          return { ok: false, error: `Limit is ${MAX_FILES} files per review.` };
        }

        // Collide-proof the name so two uploads called index.jsx both survive.
        let finalName = name;
        let counter = 1;
        while (files.some((f) => f.name === finalName)) {
          const dot = name.lastIndexOf('.');
          finalName =
            dot === -1
              ? `${name}-${counter}`
              : `${name.slice(0, dot)}-${counter}${name.slice(dot)}`;
          counter += 1;
        }

        const file = { id: uid('file'), name: finalName, content };
        set({ files: [...files, file], activeFileId: file.id });
        return { ok: true, file };
      },

      updateFile(id, patch) {
        set((state) => ({
          files: state.files.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        }));
      },

      removeFile(id) {
        set((state) => {
          const files = state.files.filter((f) => f.id !== id);
          const activeFileId =
            state.activeFileId === id ? (files[0]?.id ?? null) : state.activeFileId;
          return { files, activeFileId };
        });
      },

      setActiveFile(id) {
        set({ activeFileId: id });
      },

      clearFiles() {
        set({ files: [], activeFileId: null, run: emptyRun() });
      },

      loadSamples() {
        set({ files: SAMPLE_FILES, activeFileId: SAMPLE_FILES[0].id, run: emptyRun() });
      },

      activeFile() {
        const { files, activeFileId } = get();
        return files.find((f) => f.id === activeFileId) ?? files[0] ?? null;
      },

      totalLines() {
        return get().files.reduce((sum, f) => sum + f.content.split('\n').length, 0);
      },

      /**
       * Replace `codeBefore` with `codeAfter` in whichever file contains it.
       * Only the first occurrence is replaced — findings are one-per-site, and
       * a blind global replace would rewrite unrelated identical lines.
       */
      applyFix(finding) {
        const { files } = get();
        const target = files.find(
          (f) => f.name === finding.file && f.content.includes(finding.codeBefore)
        );
        if (!target || !finding.codeBefore || !finding.codeAfter) return false;

        const index = target.content.indexOf(finding.codeBefore);
        const nextContent =
          target.content.slice(0, index) +
          finding.codeAfter +
          target.content.slice(index + finding.codeBefore.length);

        set({
          files: files.map((f) => (f.id === target.id ? { ...f, content: nextContent } : f)),
          activeFileId: target.id,
        });
        return true;
      },

      /* ----------------------------------------------------- run state -- */

      beginRun() {
        set({
          run: { ...emptyRun(), status: 'analyzing', startedAt: Date.now() },
          focusedFindingId: null,
        });
      },

      setRunStatus(status) {
        set((state) => ({ run: { ...state.run, status } }));
      },

      setRunMeta(meta) {
        set((state) => ({ run: { ...state.run, ...meta } }));
      },

      appendReasoning(text) {
        set((state) => ({ run: { ...state.run, reasoning: state.run.reasoning + text } }));
      },

      /** Seed the panel with instant local findings before the model answers. */
      seedStaticFindings(findings) {
        set((state) => ({ run: { ...state.run, findings } }));
      },

      addFinding(finding) {
        set((state) => {
          // Model findings supersede a static finding at the same site.
          const deduped = state.run.findings.filter(
            (f) =>
              !(
                f.source === 'static' &&
                f.file === finding.file &&
                f.category === finding.category &&
                Math.abs((f.line ?? 0) - (finding.line ?? 0)) <= 3
              )
          );
          if (deduped.some((f) => f.id === finding.id)) return state;
          return { run: { ...state.run, findings: [...deduped, finding] } };
        });
      },

      setSummary(summary) {
        set((state) => ({ run: { ...state.run, summary } }));
      },

      setDone(done) {
        set((state) => ({ run: { ...state.run, done } }));
      },

      setWarning(warning) {
        set((state) => ({ run: { ...state.run, warning } }));
      },

      finishRun(meta = {}) {
        set((state) => ({
          run: { ...state.run, status: 'complete', finishedAt: Date.now(), ...meta },
        }));
      },

      failRun(error) {
        set((state) => ({
          run: { ...state.run, status: 'error', error, finishedAt: Date.now() },
        }));
      },

      cancelRun() {
        set((state) => ({
          run: { ...state.run, status: 'cancelled', finishedAt: Date.now() },
        }));
      },

      resetRun() {
        set({ run: emptyRun(), focusedFindingId: null });
      },

      focusFinding(id) {
        set({ focusedFindingId: id });
      },

      /** Rehydrate a saved review into the workspace for re-reading. */
      loadReview(review) {
        set({
          files: review.files.map((f) => ({ ...f, id: f.id ?? uid('file') })),
          activeFileId: review.files[0]?.id ?? null,
          run: {
            ...emptyRun(),
            status: 'complete',
            mode: review.mode,
            model: review.model,
            findings: review.findings ?? [],
            summary: review.summary ?? null,
            done: review.done ?? null,
            usage: review.usage ?? null,
            startedAt: new Date(review.createdAt).getTime(),
            finishedAt: new Date(review.createdAt).getTime() + (review.durationMs ?? 0),
          },
        });
      },
    }),
    {
      name: STORAGE_KEYS.workspace,
      storage: createJSONStorage(() => sessionStorage),
      // The run is transient — persisting a half-streamed review would
      // restore a UI stuck mid-stream on refresh.
      partialize: (state) => ({ files: state.files, activeFileId: state.activeFileId }),
    }
  )
);
