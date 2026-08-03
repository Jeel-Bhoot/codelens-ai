'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/constants';

const MAX_HISTORY = 50;

export const useHistoryStore = create()(
  persist(
    (set, get) => ({
      reviews: [],

      save(review) {
        set((state) => ({
          // Newest first, capped — localStorage has a hard quota and a
          // review with full source can be tens of KB.
          reviews: [review, ...state.reviews.filter((r) => r.id !== review.id)].slice(
            0,
            MAX_HISTORY
          ),
        }));
        return review.id;
      },

      remove(id) {
        set((state) => ({ reviews: state.reviews.filter((r) => r.id !== id) }));
      },

      clear() {
        set({ reviews: [] });
      },

      getById(id) {
        return get().reviews.find((r) => r.id === id) ?? null;
      },

      /** Aggregates for the dashboard, computed once per call. */
      stats() {
        const { reviews } = get();
        if (!reviews.length) {
          return {
            total: 0,
            averageScore: 0,
            totalFindings: 0,
            criticalOpen: 0,
            trend: [],
            bySeverity: {},
            byCategory: {},
            scoreDelta: 0,
          };
        }

        const totalFindings = reviews.reduce((sum, r) => sum + (r.findings?.length ?? 0), 0);
        const averageScore = Math.round(
          reviews.reduce((sum, r) => sum + (r.score ?? 0), 0) / reviews.length
        );

        const bySeverity = {};
        const byCategory = {};
        reviews.forEach((r) => {
          (r.findings ?? []).forEach((f) => {
            bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
            byCategory[f.category] = (byCategory[f.category] || 0) + 1;
          });
        });

        // Oldest → newest so the chart reads left to right.
        const trend = [...reviews]
          .reverse()
          .slice(-12)
          .map((r) => ({
            id: r.id,
            name: r.title,
            score: r.score,
            findings: r.findings?.length ?? 0,
            date: r.createdAt,
          }));

        const recent = reviews.slice(0, 5);
        const older = reviews.slice(5, 10);
        const avg = (list) =>
          list.length ? list.reduce((s, r) => s + (r.score ?? 0), 0) / list.length : 0;
        const scoreDelta = older.length ? Math.round(avg(recent) - avg(older)) : 0;

        return {
          total: reviews.length,
          averageScore,
          totalFindings,
          criticalOpen: bySeverity.critical ?? 0,
          trend,
          bySeverity,
          byCategory,
          scoreDelta,
        };
      },
    }),
    {
      name: STORAGE_KEYS.reviews,
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
