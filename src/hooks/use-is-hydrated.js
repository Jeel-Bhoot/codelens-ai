'use client';

import { useSyncExternalStore } from 'react';

// Never fires — hydration happens exactly once and never reverts.
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * True once the client has hydrated, false during SSR and the first paint.
 *
 * This replaces the common `const [mounted, setMounted] = useState(false)` +
 * `useEffect(() => setMounted(true), [])` gate. That pattern works, but it
 * calls setState synchronously inside an effect, which forces a second render
 * pass on every component that uses it — and React 19's
 * `react-hooks/set-state-in-effect` rule flags it for exactly that reason.
 *
 * `useSyncExternalStore` gives React two snapshots instead: `false` on the
 * server, `true` on the client. No effect, no cascading render, and the
 * server and client markup still agree — which is the whole point of the gate
 * for anything reading localStorage, `window`, or a resolved theme.
 */
export function useIsHydrated() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
