import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Vendor Monaco into /public so it is served from our own origin.
 *
 * `@monaco-editor/react` defaults to loading the editor from jsdelivr. Our CSP
 * is `script-src 'self'`, so the CDN request is blocked and the editor never
 * initialises — a failure that only shows up in a real browser, because the
 * build and the linter never load it.
 *
 * Widening the CSP would fix the symptom by making the app less safe and
 * adding a third-party runtime dependency on the critical path. Copying the
 * files is ~16MB of static assets, served from the same origin, and works
 * offline. They are generated at install time and gitignored.
 */

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const source = join(root, 'node_modules', 'monaco-editor', 'min', 'vs');
const destination = join(root, 'public', 'monaco', 'vs');

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(source))) {
  // Not fatal: `npm ci --omit=dev` or a partial install shouldn't break here.
  console.warn('[monaco] node_modules/monaco-editor/min/vs not found — skipping copy.');
  process.exit(0);
}

// The loader is version-pinned by path, so a stale copy after an upgrade would
// silently serve the old editor. Replace it wholesale.
await rm(destination, { recursive: true, force: true });
await mkdir(dirname(destination), { recursive: true });
await cp(source, destination, { recursive: true });

console.log('[monaco] vendored to public/monaco/vs');
