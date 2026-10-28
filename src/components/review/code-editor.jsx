'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReviewStore } from '@/store/review-store';
import { useSettingsStore } from '@/store/settings-store';
import { useMonacoLoader } from '@/hooks/use-monaco-loader';
import { languageFromFilename, debounce } from '@/lib/utils';
import { Skeleton } from '@/components/ui/misc';

// Monaco is ~4MB and needs `window`. Loading it lazily keeps it out of the
// initial bundle entirely.
//
// The loader is repointed at our own origin — @monaco-editor/react defaults to
// jsdelivr, which our `script-src 'self'` CSP blocks outright — and its files
// are vendored into /public by scripts/copy-monaco.mjs at install time. That
// configuration happens in useMonacoLoader, which must run before this mounts.
const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((m) => m.Editor), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

function EditorSkeleton() {
  return (
    <div className="h-full space-y-2 p-4" aria-busy="true" aria-label="Loading editor">
      {Array.from({ length: 14 }).map((_, i) => (
        <Skeleton key={i} className="h-3.5" style={{ width: `${45 + ((i * 17) % 50)}%` }} />
      ))}
    </div>
  );
}

/**
 * Shown when Monaco cannot load at all. A plain textarea is a downgrade, but
 * it keeps the workspace usable — you can still read, edit and review — which
 * an indefinite spinner does not.
 */
function PlainTextEditor({ file, onChange, fontSize, onRetry }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs" role="status">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-severity-medium" aria-hidden="true" />
        <span className="flex-1 text-muted-foreground">
          The rich editor could not load. Editing still works — syntax highlighting and gutter
          markers are unavailable.
        </span>
        <Button variant="ghost" size="sm" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>

      <textarea
        value={file.content}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        aria-label={`Source of ${file.name}`}
        className="scrollbar-thin h-full w-full flex-1 resize-none bg-background p-4 font-mono leading-relaxed outline-none"
        style={{ fontSize: `${fontSize}px`, tabSize: 2 }}
      />
    </div>
  );
}

const SEVERITY_GLYPH = {
  critical: 'codelens-marker-critical',
  high: 'codelens-marker-high',
  medium: 'codelens-marker-medium',
  low: 'codelens-marker-low',
  info: 'codelens-marker-info',
};

export function CodeEditor() {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef(null);

  const { resolvedTheme } = useTheme();
  const { status: editorStatus, retry: retryEditor } = useMonacoLoader();

  // `s.activeFile()` reads the store via `get()` rather than the snapshot the
  // selector was handed, which is the wrong source during hydration. Select the
  // two primitives it depends on and resolve the file during render.
  const files = useReviewStore((s) => s.files);
  const activeFileId = useReviewStore((s) => s.activeFileId);
  const activeFile = files.find((f) => f.id === activeFileId) ?? files[0] ?? null;

  const updateFile = useReviewStore((s) => s.updateFile);
  const findings = useReviewStore((s) => s.run.findings);
  const focusedFindingId = useReviewStore((s) => s.focusedFindingId);

  const fontSize = useSettingsStore((s) => s.editorFontSize);
  const wordWrap = useSettingsStore((s) => s.editorWordWrap);
  const minimap = useSettingsStore((s) => s.editorMinimap);

  // Debounced so a fast typist doesn't write to the store on every keystroke.
  const commitRef = useRef(null);
  useEffect(() => {
    commitRef.current = debounce((id, content) => updateFile(id, { content }), 250);
    return () => commitRef.current?.cancel();
  }, [updateFile]);

  /* ------------------------------------------------- gutter decorations -- */

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !activeFile) return;

    const relevant = findings.filter((f) => f.file === activeFile.name && f.line);

    const decorations = relevant.map((finding) => ({
      range: new monaco.Range(finding.line, 1, finding.endLine || finding.line, 1),
      options: {
        isWholeLine: true,
        linesDecorationsClassName: SEVERITY_GLYPH[finding.severity],
        className: finding.id === focusedFindingId ? 'codelens-line-focused' : undefined,
        hoverMessage: { value: `**${finding.title}**\n\n${finding.description}` },
      },
    }));

    // createDecorationsCollection replaces deltaDecorations and cleans up
    // its own previous set — no id bookkeeping needed.
    decorationsRef.current?.clear();
    decorationsRef.current = editor.createDecorationsCollection(decorations);
  }, [findings, activeFile, focusedFindingId]);

  /* ------------------------------------------------------ reveal on click -- */

  useEffect(() => {
    if (!focusedFindingId || !editorRef.current) return;
    const finding = findings.find((f) => f.id === focusedFindingId);
    if (!finding?.line || finding.file !== activeFile?.name) return;

    editorRef.current.revealLineInCenter(finding.line);
    editorRef.current.setPosition({ lineNumber: finding.line, column: 1 });
  }, [focusedFindingId, findings, activeFile]);

  if (!activeFile) {
    return (
      <div className="grid h-full place-items-center p-8 text-center">
        <div>
          <p className="text-sm font-medium">No file selected</p>
          <p className="mt-1 text-sm text-muted-foreground">Add a file to start reviewing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {editorStatus === 'loading' ? <EditorSkeleton /> : null}

      {editorStatus === 'failed' ? (
        <PlainTextEditor
          file={activeFile}
          fontSize={fontSize}
          onRetry={retryEditor}
          onChange={(value) => commitRef.current?.(activeFile.id, value)}
        />
      ) : null}

      {editorStatus === 'ready' ? (
        <MonacoEditor
          height="100%"
          theme={resolvedTheme === 'dark' ? 'codelens-dark' : 'codelens-light'}
          language={languageFromFilename(activeFile.name)}
          path={activeFile.name}
          value={activeFile.content}
          onChange={(value) => commitRef.current?.(activeFile.id, value ?? '')}
          beforeMount={(monaco) => {
            // Themes must exist before the first render or Monaco falls back
            // to vs-dark and flashes on the next paint.
            monaco.editor.defineTheme('codelens-dark', {
              base: 'vs-dark',
              inherit: true,
              rules: [],
              colors: {
                'editor.background': '#0b1120',
                'editorGutter.background': '#0b1120',
                'editor.lineHighlightBackground': '#16213c55',
                'editorLineNumber.foreground': '#475569',
              },
            });
            monaco.editor.defineTheme('codelens-light', {
              base: 'vs',
              inherit: true,
              rules: [],
              colors: {
                'editor.background': '#ffffff',
                'editorGutter.background': '#ffffff',
                'editor.lineHighlightBackground': '#f1f5f9',
              },
            });
          }}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
          }}
          options={{
            fontSize,
            fontFamily: 'var(--font-mono), ui-monospace, monospace',
            fontLigatures: true,
            wordWrap: wordWrap ? 'on' : 'off',
            minimap: { enabled: minimap },
            lineNumbers: 'on',
            glyphMargin: false,
            lineDecorationsWidth: 12,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            padding: { top: 14, bottom: 14 },
            renderLineHighlight: 'line',
            tabSize: 2,
            automaticLayout: true,
            scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
          }}
        />
      ) : null}
    </div>
  );
}
