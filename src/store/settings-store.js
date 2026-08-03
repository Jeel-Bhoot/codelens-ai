'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORAGE_KEYS, CATEGORY_KEYS } from '@/lib/constants';

export const useSettingsStore = create()(
  persist(
    (set) => ({
      profile: 'standard',
      focus: [],
      notes: '',

      /**
       * Optional bring-your-own key. Stored in this browser only and sent
       * per-request over HTTPS; the server never writes it anywhere.
       */
      apiKey: '',
      /** Empty = follow whatever the server has configured. */
      model: '',

      editorFontSize: 13,
      editorWordWrap: true,
      editorMinimap: false,
      showStaticFindings: true,
      showReasoning: true,
      autoScrollFindings: true,

      setProfile: (profile) => set({ profile }),
      setNotes: (notes) => set({ notes }),
      setApiKey: (apiKey) => set({ apiKey: apiKey.trim() }),
      setModel: (model) => set({ model }),

      toggleFocus: (category) =>
        set((state) => ({
          focus: state.focus.includes(category)
            ? state.focus.filter((c) => c !== category)
            : [...state.focus, category].filter((c) => CATEGORY_KEYS.includes(c)),
        })),

      update: (patch) => set(patch),

      reset: () =>
        set({
          profile: 'standard',
          focus: [],
          notes: '',
          editorFontSize: 13,
          editorWordWrap: true,
          editorMinimap: false,
          showStaticFindings: true,
          showReasoning: true,
          autoScrollFindings: true,
        }),
    }),
    {
      name: STORAGE_KEYS.settings,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
