import { z } from 'zod';
import {
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  CATEGORY_KEYS,
  REVIEW_PROFILES,
} from '../constants';

export const reviewFileSchema = z.object({
  name: z
    .string()
    .min(1, 'File name is required')
    .max(200)
    // Reject path separators outright — nothing here writes to disk, but a
    // filename is echoed into the prompt and rendered in the UI.
    .regex(/^[^/\\]+$/, 'File name must not contain a path'),
  content: z
    .string()
    .min(1, 'File is empty')
    .refine((v) => new Blob([v]).size <= MAX_FILE_BYTES, `File exceeds ${MAX_FILE_BYTES / 1024}KB`),
});

export const reviewRequestSchema = z
  .object({
    files: z.array(reviewFileSchema).min(1, 'Add at least one file').max(MAX_FILES),
    profile: z.enum(Object.keys(REVIEW_PROFILES)).default('standard'),
    focus: z.array(z.enum(CATEGORY_KEYS)).max(CATEGORY_KEYS.length).default([]),
    notes: z.string().max(2000).default(''),
    apiKey: z.string().trim().max(200).optional(),
    // Honoured only for free-tier providers, and only against a server-side
    // allowlist — see providers/models.js. Anything else is ignored, never
    // an error, so a stale localStorage value degrades to the default.
    model: z.string().trim().max(80).optional(),
  })
  .refine(
    (data) => data.files.reduce((sum, f) => sum + new Blob([f.content]).size, 0) <= MAX_TOTAL_BYTES,
    { message: `Total size exceeds ${MAX_TOTAL_BYTES / 1024}KB`, path: ['files'] }
  );
