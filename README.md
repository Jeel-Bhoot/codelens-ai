# Critiq — AI Frontend Code Reviewer

Paste a React component, watch a principal-level code review stream back in real time. Findings appear one at a time as the model writes them, each pinned to an exact line with a before/after fix you can apply in one click.

Built with Next.js 16 and React 19. Runs on **Claude** or **Gemini** — or on a local rule engine with no key at all. **JavaScript, not TypeScript.**

```bash
npm install
npm run dev          # http://localhost:3000
```

No API key needed to try it, and a **free** Gemini key gets you a real model — see [Demo mode](#demo-mode).

---

## What it does

Six lenses over the same code: **performance**, **accessibility**, **React best practices**, **security**, **maintainability**, **correctness**. Every finding carries a severity, a file and line, why it matters, and a concrete fix.

| | |
|---|---|
| **Streaming** | Findings render the instant each one is written, not at end of response |
| **Instant local pass** | A deterministic rule engine runs in the browser on paste — findings in ~5ms, before the network responds |
| **One-click fixes** | Every fix is a diff; apply it and the editor is patched in place |
| **Multi-file** | Drag files or a `.zip`; findings link back to the offending line |
| **Reasoning panel** | The model's summarised thinking streams into its own collapsible pane |
| **Scoring & history** | 0–100 quality score, saved reviews, trend charts |
| **Export** | PDF, Markdown, JSON (for a CI gate), or a zip of report + source |

---

## The part worth reading

### Findings stream individually, not in a batch

Most "streaming AI" UIs stream *text*. That's easy. Streaming **structured findings** — so each card appears the moment it's complete — is the actual problem, and it's solved in three pieces.

**1. The model emits NDJSON, not a JSON document.**

A single JSON object can only be parsed once it's closed, which means nothing renders until the response finishes. One JSON object *per line* can be parsed per line:

```jsonc
{"type":"summary","overview":"…","strengths":["…"]}
{"type":"finding","severity":"critical","file":"Cart.jsx","line":42,…}
{"type":"finding","severity":"high","file":"Cart.jsx","line":58,…}
{"type":"done","verdict":"…","topPriorities":["…"]}
```

**2. A rolling buffer emits complete lines as they close.**

Tokens almost never land on a line boundary, so [`createNdjsonReader`](src/lib/ai/stream.js) holds the partial tail and flushes each complete line:

```js
push(chunk) {
  buffer += chunk;
  let i = buffer.indexOf('\n');
  while (i !== -1) {
    consume(buffer.slice(0, i));      // one finished record → straight to the UI
    buffer = buffer.slice(i + 1);
    i = buffer.indexOf('\n');
  }
}
```

A line that fails to parse is dropped, not thrown — one malformed record never kills a review that's 80% delivered.

**3. The route handler speaks a typed SSE dialect.**

[`/api/review`](src/app/api/review/route.js) tags each frame (`reasoning`, `token`, `record`, `warning`, `error`, `complete`) so the client routes reasoning tokens to the thinking panel and review tokens to the NDJSON reader without sniffing payload shapes.

### The demo never dead-ends

Without an API key the app runs the **same pipeline** against a local analysis engine — same SSE envelope, same records, same client code path, same UI. Not a canned response: [`demo-reviewer.js`](src/lib/ai/demo-reviewer.js) runs the real rule engine over the visitor's actual code, seeded deterministically from the input hash so the same code always produces the same review.

A recruiter opening the deployed link gets a complete working product, and it costs nothing per visit.

### The local pass is a floor, not a fallback

[`static-rules.js`](src/lib/analysis/static-rules.js) is ~20 heuristic rules that run before any request goes out. It grounds the AI review — findings are merged and de-duplicated by `(file, category, line ± 3)`, with the model's version winning because it carries a fix.

Each rule declares a `confidence`, and the UI shows it, because regex heuristics are not an AST and pretending otherwise is dishonest. Comments are stripped before matching; string *contents* are preserved for rules that legitimately match inside quotes (`target="_blank"`, a credential assigned to a literal) and masked only for rules matching code constructs (`eval(`, `==`).

### Prompt engineering that changes the output

Two decisions in [`prompt.js`](src/lib/ai/prompt.js) that materially affect quality:

- **"Report everything, we filter downstream."** Telling a modern model to *only report important issues* makes it apply that filter itself and silently drop real findings — recall falls while the analysis stays just as thorough. Severity is metadata here, not a gate.
- **Line-numbered input.** Every line is prefixed `  42 | …` so the model can cite locations precisely. The prefix is stripped before anything reaches the user.

The system prompt is byte-identical across requests and marked `cache_control: ephemeral`, so it's re-read at roughly a tenth of the input cost.

### Derived state instead of synced state

React 19's `react-hooks/set-state-in-effect` rule flags the ubiquitous hydration gate:

```js
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);       // ← cascading render, every time
```

Replaced throughout with [`useIsHydrated`](src/hooks/use-is-hydrated.js), built on `useSyncExternalStore` — `false` on the server, `true` on the client, no effect and no second render pass. The same principle removed synced state from the score dial, the reasoning panel, the landing animation and the chart theming: values that can be *derived* during render aren't stored.

### Cancellation actually cancels

Aborting the client fetch closes the response body → the route handler observes `request.signal` → the upstream model request is aborted. A cancelled review stops costing money immediately, rather than finishing invisibly.

---

## Demo mode

| Configuration | What runs |
|---|---|
| No `.env.local` at all | Local analysis engine. Everything works, but it isn't a model. |
| **`GEMINI_API_KEY` set** | **Live streaming from `gemini-3.5-flash` — free, no card** |
| Both keys set | Gemini wins. The paid provider also needs `ALLOW_PAID_PROVIDER=true` |
| `ANTHROPIC_API_KEY` set | Live streaming from `claude-opus-5` (takes precedence) |
| Visitor pastes their own key in Settings | Live on their key, held in their browser only |
| `NEXT_PUBLIC_FORCE_DEMO_MODE=true` | Local engine even when a key exists |

```bash
cp .env.example .env.local
# then add GEMINI_API_KEY — free at https://aistudio.google.com/apikey
```

Keys are read in a server route handler and never reach the browser. `GET /api/health` reports *which provider and model* are configured, never the key.

### Two providers, one pipeline

[`providers/`](src/lib/ai/providers) holds one module per service behind a common `stream(...) → SSE` signature. Nothing downstream knows which one ran: the NDJSON contract is carried by the *prompt*, not by an SDK, so the parser, the store and the UI are identical either way.

Gemini is plain `fetch` — one POST and a read loop. Three details there each break streaming *silently* rather than erroring, and are commented in [`gemini.js`](src/lib/ai/providers/gemini.js): `?alt=sse` is mandatory (without it you get one streamed JSON array and an SSE reader finds nothing); every chunk is a full `GenerateContentResponse`, not a delta; and a part with `thought: true` is reasoning, so concatenating all parts splices the model's private thinking into the review.

### Who may choose the model

Settings shows a **model picker only when the configured provider is free**. That is the whole access-control rule, and it falls out of one asymmetry:

- **Gemini** — every id in the allowlist is free-tier, so a stranger picking the "best" one cannot run up a bill. The worst case is spending a free quota, which the per-IP rate limit already bounds. Selectable.
- **Anthropic** — billed per token. The model is read from server env only, and [`streamFromAnthropic`](src/lib/ai/providers/anthropic.js) never destructures a `model` argument, so a client-supplied value is ignored *structurally* rather than by a check that could be got wrong.

The allowlist lives in [`models.js`](src/lib/ai/providers/models.js), and every id in it was confirmed by calling `:streamGenerateContent` with a newly issued free key rather than by reading the docs. That distinction earned its keep: `gemini-2.5-flash` and `gemini-2.5-flash-lite` are documented **Stable** and **"Free of charge"**, still appear in `ListModels`, and return **404 "no longer available to new users"**. `gemini-2.5-pro` returns **429 on the first request ever made** — its free-tier limit is zero, so "free" there is a price with no entitlement behind it. Three of seven plausible candidates failed, and none failed the way the documentation predicted. An unrecognised value — a paid id, a made-up one, a path-traversal attempt — falls back to the configured default rather than erroring, so a stale value in someone's `localStorage` degrades quietly instead of breaking their review.

### The Messages API is not uniform across models

Sending an unsupported parameter is a hard 400, not a silent ignore — so [`anthropic.js`](src/lib/ai/providers/anthropic.js) keeps a per-model capability map and builds only what that model accepts.

This started as a real bug: the route sent `output_config.effort` and `thinking: {type:'adaptive'}` unconditionally, so setting `ANTHROPIC_MODEL=claude-haiku-4-5` — the obvious way to cut cost — failed *every* request. Haiku 4.5 rejects `effort` at every level, so the field has to be dropped entirely rather than down-shifted, and its only thinking mode is the older `budget_tokens` form. An unknown model falls back to the smallest request every model accepts: it loses the reasoning panel, but it cannot 400.

---

## Architecture

```
src/
├── app/
│   ├── (app)/                 review · dashboard · history · settings
│   ├── api/review/route.js    SSE streaming endpoint
│   └── api/health/route.js    capability probe
├── components/
│   ├── ui/                    Radix + CVA primitives
│   ├── review/                workspace, editor, findings, export
│   ├── dashboard/             charts and metrics
│   └── layout/                shell, command palette, theme
├── lib/
│   ├── ai/                    prompt · NDJSON+SSE parsing · demo reviewer
│   ├── analysis/              local rule engine
│   ├── export/                PDF · Markdown · JSON · Zip
│   ├── validation/            zod schemas, shared client and server
│   └── scoring.js             severity-weighted score
├── store/                     zustand: review · history · settings
└── hooks/                     streaming, uploads, hydration, media query
```

### Data flow of one review

```
paste/upload
   ↓
local rule engine ──────────────────► findings render (~5ms)
   ↓
POST /api/review  (zod-validated, rate-limited)
   ↓
Anthropic Messages API, streamed
   ↓
SSE frames: reasoning │ token │ record │ complete
   ↓
NDJSON reader, one record per line
   ↓
merge + dedupe vs local findings ───► each card renders as it closes
   ↓
score · save to history · export
```

---

## Security

- Anthropic key server-side only; never in a client bundle
- CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` on every response
- Every request body validated with a zod schema before use
- Per-IP sliding-window rate limit on the review endpoint
- No accounts, credentials or sessions exist at all — see below
- Provider errors mapped to safe messages — no internals or key material leak to the browser

### Two bugs only a browser could find

Both survived a clean build, a zero-warning lint and a green API smoke test. Neither is visible without opening the app in Chrome.

**Monaco was loaded from a CDN that our own CSP blocked.** `@monaco-editor/react` defaults to fetching the editor from jsdelivr; `script-src 'self'` refused it, and the component has no error path — so the editor pane read *"Loading…"* forever. The editor is now [vendored into `/public`](scripts/copy-monaco.mjs) at install time and served same-origin. It also works offline, and drops a third-party dependency off the critical path.

That exposed the deeper problem: **a failure that never surfaces**. [`useMonacoLoader`](src/hooks/use-monaco-loader.js) now drives `loader.init()` directly, so a rejection becomes a real error state and a timeout catches the hang that never rejects. When it fails you get a plain-text editor and a retry — degraded, but you can still work.

**The workspace mounted two editors.** The responsive layout rendered the tree twice and hid one with `hidden lg:flex` / `lg:hidden`. CSS hides a subtree; it does not unmount it — so every visitor loaded two Monaco instances and saw one. [`useMediaQuery`](src/hooks/use-media-query.js) now picks one layout, and the DOM node count for the workspace halved.

### No accounts, on purpose

There is no sign-in, and that is the design rather than a gap.

Every piece of state this app holds — your files, your review history, your settings — lives in **your own browser**. There is no server-side record of any of it. A login would therefore have authenticated you against your own `localStorage`: a gate with nothing behind it, protecting your data from you.

Earlier versions had three separate attempts at it — email/password accounts in `localStorage` with a hand-rolled PBKDF2 hash and self-signed session token, a canvas captcha, a server-verified email code flow, and finally real Google OAuth through Auth.js. All of them worked. All of them are deleted, along with `next-auth`, `crypto-js` and `js-cookie`.

What removing it bought:

- **No credentials to leak.** No password store, no user table, no session secret, no OAuth client secret.
- **Every page is static again.** `/dashboard`, `/review`, `/history` and `/settings` are prerendered; they were server-rendered on every request purely to resolve a session.
- **No edge middleware at all** — `proxy.js` existed only to gate routes.
- **Nothing between a visitor and the product.** Open the link, paste code, get a review.

If this ever grows a backend, authentication comes back with something real to protect. Adding it before that point is theatre.

---

## Demo mode

| Configuration | What runs |
|---|---|
| No `.env.local` at all | Local analysis engine. Everything works, but it isn't a model. |
| **`GEMINI_API_KEY` set** | **Live streaming from `gemini-3.5-flash` — free, no card** |
| Both keys set | Gemini wins. The paid provider also needs `ALLOW_PAID_PROVIDER=true` |
| `ANTHROPIC_API_KEY` set | Live streaming from `claude-opus-5` (takes precedence) |
| Visitor pastes their own key in Settings | Live on their key, held in their browser only |
| `NEXT_PUBLIC_FORCE_DEMO_MODE=true` | Local engine even when a key exists |

```bash
cp .env.example .env.local
# then add GEMINI_API_KEY — free at https://aistudio.google.com/apikey
```

Keys are read in a server route handler and never reach the browser. `GET /api/health` reports *which provider and model* are configured, never the key.

### Two providers, one pipeline

[`providers/`](src/lib/ai/providers) holds one module per service behind a common `stream(...) → SSE` signature. Nothing downstream knows which one ran: the NDJSON contract is carried by the *prompt*, not by an SDK, so the parser, the store and the UI are identical either way.

Gemini is plain `fetch` — one POST and a read loop. Three details there each break streaming *silently* rather than erroring, and are commented in [`gemini.js`](src/lib/ai/providers/gemini.js): `?alt=sse` is mandatory (without it you get one streamed JSON array and an SSE reader finds nothing); every chunk is a full `GenerateContentResponse`, not a delta; and a part with `thought: true` is reasoning, so concatenating all parts splices the model's private thinking into the review.

### Who may choose the model

Settings shows a **model picker only when the configured provider is free**. That is the whole access-control rule, and it falls out of one asymmetry:

- **Gemini** — every id in the allowlist is free-tier, so a stranger picking the "best" one cannot run up a bill. The worst case is spending a free quota, which the per-IP rate limit already bounds. Selectable.
- **Anthropic** — billed per token. The model is read from server env only, and [`streamFromAnthropic`](src/lib/ai/providers/anthropic.js) never destructures a `model` argument, so a client-supplied value is ignored *structurally* rather than by a check that could be got wrong.

The allowlist lives in [`models.js`](src/lib/ai/providers/models.js), and every id in it was confirmed by calling `:streamGenerateContent` with a newly issued free key rather than by reading the docs. That distinction earned its keep: `gemini-2.5-flash` and `gemini-2.5-flash-lite` are documented **Stable** and **"Free of charge"**, still appear in `ListModels`, and return **404 "no longer available to new users"**. `gemini-2.5-pro` returns **429 on the first request ever made** — its free-tier limit is zero, so "free" there is a price with no entitlement behind it. Three of seven plausible candidates failed, and none failed the way the documentation predicted. An unrecognised value — a paid id, a made-up one, a path-traversal attempt — falls back to the configured default rather than erroring, so a stale value in someone's `localStorage` degrades quietly instead of breaking their review.

### The Messages API is not uniform across models

Sending an unsupported parameter is a hard 400, not a silent ignore — so [`anthropic.js`](src/lib/ai/providers/anthropic.js) keeps a per-model capability map and builds only what that model accepts.

This started as a real bug: the route sent `output_config.effort` and `thinking: {type:'adaptive'}` unconditionally, so setting `ANTHROPIC_MODEL=claude-haiku-4-5` — the obvious way to cut cost — failed *every* request. Haiku 4.5 rejects `effort` at every level, so the field has to be dropped entirely rather than down-shifted, and its only thinking mode is the older `budget_tokens` form. An unknown model falls back to the smallest request every model accepts: it loses the reasoning panel, but it cannot 400.

---

## Architecture

```
src/
├── app/
│   ├── (app)/                 review · dashboard · history · settings
│   ├── api/review/route.js    SSE streaming endpoint
│   └── api/health/route.js    capability probe
├── components/
│   ├── ui/                    Radix + CVA primitives
│   ├── review/                workspace, editor, findings, export
│   ├── dashboard/             charts and metrics
│   └── layout/                shell, command palette, theme
├── lib/
│   ├── ai/                    prompt · NDJSON+SSE parsing · demo reviewer
│   ├── analysis/              local rule engine
│   ├── export/                PDF · Markdown · JSON · Zip
│   ├── validation/            zod schemas, shared client and server
│   └── scoring.js             severity-weighted score
├── store/                     zustand: review · history · settings
└── hooks/                     streaming, uploads, hydration, media query
```

### Data flow of one review

```
paste/upload
   ↓
local rule engine ──────────────────► findings render (~5ms)
   ↓
POST /api/review  (zod-validated, rate-limited)
   ↓
Anthropic Messages API, streamed
   ↓
SSE frames: reasoning │ token │ record │ complete
   ↓
NDJSON reader, one record per line
   ↓
merge + dedupe vs local findings ───► each card renders as it closes
   ↓
score · save to history · export
```

---

## Security

- Anthropic key server-side only; never in a client bundle
- CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` on every response
- Every request body validated with a zod schema before use
- Per-IP sliding-window rate limit on the review endpoint
- No accounts, credentials or sessions exist at all — see below
- Provider errors mapped to safe messages — no internals or key material leak to the browser

### Two bugs only a browser could find

Both survived a clean build, a zero-warning lint and a green API smoke test. Neither is visible without opening the app in Chrome.

**Monaco was loaded from a CDN that our own CSP blocked.** `@monaco-editor/react` defaults to fetching the editor from jsdelivr; `script-src 'self'` refused it, and the component has no error path — so the editor pane read *"Loading…"* forever. The editor is now [vendored into `/public`](scripts/copy-monaco.mjs) at install time and served same-origin. It also works offline, and drops a third-party dependency off the critical path.

That exposed the deeper problem: **a failure that never surfaces**. [`useMonacoLoader`](src/hooks/use-monaco-loader.js) now drives `loader.init()` directly, so a rejection becomes a real error state and a timeout catches the hang that never rejects. When it fails you get a plain-text editor and a retry — degraded, but you can still work.

**The workspace mounted two editors.** The responsive layout rendered the tree twice and hid one with `hidden lg:flex` / `lg:hidden`. CSS hides a subtree; it does not unmount it — so every visitor loaded two Monaco instances and saw one. [`useMediaQuery`](src/hooks/use-media-query.js) now picks one layout, and the DOM node count for the workspace halved.

## Accessibility

Keyboard operable throughout, with a visible focus ring on every control and a skip link as the first tab stop. Form fields carry labels and `aria-describedby`; validation errors are announced via `role="alert"`; streaming status via `aria-live`. Every animation is gated on `prefers-reduced-motion`. Charts never encode identity in colour alone — legends and text labels throughout.

---

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # serve the build
npm run lint       # eslint — currently zero errors, zero warnings
npm run format     # prettier
```

## Deploy

**Vercel** — import the repo and deploy. Set **no** environment variables: the app runs the local engine and costs nothing per visitor.

See **[DEPLOY.md](DEPLOY.md)** for the full guide — free hosting tiers, the one configuration mistake that costs money, running live mode locally, and a script for recording a demo.

**Docker**

```bash
docker build -t critiq .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-ant-… critiq
```

---

## Keyboard

| | |
|---|---|
| `⌘K` / `Ctrl+K` | Command palette |
| `⌘↵` / `Ctrl+↵` | Run review — or cancel one in flight |
| `Esc` | Close dialog or palette |

---

## Notes

- **JavaScript, not TypeScript**, by requirement. Runtime validation carries the weight instead: zod schemas at both boundaries, and model output normalised and type-coerced in [`normalizeRecord`](src/lib/ai/stream.js) before it reaches a renderer.
- **No test suite**, by requirement.
- Review history is per-browser. Clearing site data clears it.

## Licence

MIT
