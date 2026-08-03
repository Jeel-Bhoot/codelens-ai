'use client';

import { useCallback, useEffect, useState } from 'react';

/** Long enough for a cold cache on a slow connection, short enough to notice. */
const LOAD_TIMEOUT_MS = 20_000;

/**
 * Drives Monaco's loader ourselves so a failure is visible.
 *
 * `@monaco-editor/react` renders its `loading` prop until the AMD loader
 * resolves and has no error path — if the loader 404s, is blocked by CSP, or
 * simply hangs, the pane reads "Loading…" forever with nothing in the UI to
 * say otherwise. That is precisely the failure this app shipped with when
 * Monaco was still being fetched from a CDN.
 *
 * Owning `loader.init()` gives us the promise, so a rejection becomes a real
 * error state, and a timeout catches the hang that never rejects at all.
 *
 * @returns {{status: 'loading'|'ready'|'failed', retry: () => void}}
 */
export function useMonacoLoader() {
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const settle = (next) => {
      if (!cancelled) setStatus(next);
    };

    const timer = setTimeout(() => settle('failed'), LOAD_TIMEOUT_MS);

    import('@monaco-editor/react')
      .then((mod) => {
        // Point the loader at our own origin. Must happen before init(), and
        // config() after init() throws — hence doing both from one place.
        try {
          mod.loader.config({ paths: { vs: '/monaco/vs' } });
        } catch {
          // Already configured by an earlier mount; init() below still applies.
        }
        return mod.loader.init();
      })
      .then(() => settle('ready'))
      .catch((error) => {
        console.error('[editor] Monaco failed to load:', error);
        settle('failed');
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [attempt]);

  return { status, retry };
}
