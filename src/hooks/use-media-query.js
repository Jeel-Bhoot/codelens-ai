'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Subscribe to a CSS media query.
 *
 * The point of using this rather than Tailwind's `hidden lg:flex` pair is that
 * CSS hides a subtree, it does not unmount it. Rendering two layouts and
 * hiding one means both mount, both run effects, and — where the subtree
 * contains something like Monaco — both load a multi-megabyte editor. Choosing
 * the layout in JS renders exactly one.
 *
 * `useSyncExternalStore` rather than useState+useEffect: matchMedia is an
 * external store, and this keeps the value derived instead of synced.
 *
 * @param {string} query e.g. '(min-width: 1024px)'
 * @param {boolean} serverDefault what to assume before hydration
 */
export function useMediaQuery(query, serverDefault = false) {
  const subscribe = useCallback(
    (onStoreChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onStoreChange);
      return () => list.removeEventListener('change', onStoreChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  // Booleans compare by value, so this is stable across calls — the thing
  // useSyncExternalStore requires of a server snapshot.
  const getServerSnapshot = useCallback(() => serverDefault, [serverDefault]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
