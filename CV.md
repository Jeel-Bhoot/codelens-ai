# CodeLens AI — CV / interview notes

Copy-ready lines for a CV, and the answers to the questions this project will get asked.

---

## One-liner

**CodeLens AI — AI Frontend Code Reviewer** · Next.js 16, React 19, JavaScript, Anthropic API
Streaming AI code review for React and CSS, with line-level findings and one-click fixes.

---

## CV bullets

Pick three or four. Ordered strongest first.

- Built an AI-powered code review platform with real-time streaming analysis, syntax highlighting, and actionable recommendations for performance, accessibility, and React best practices.

- Engineered a token-level streaming pipeline (SSE + incremental NDJSON parsing) so individual findings render the moment the model completes each one, rather than after the full response — the buffered parser also survives malformed records without failing the review.

- Designed a hybrid analysis engine pairing a ~20-rule deterministic browser pass with the AI review; local findings surface in milliseconds and are merged and de-duplicated against model output by file, category and line.

- Integrated Anthropic's Messages API in a Next.js route handler with streamed reasoning, prompt caching, request cancellation propagated to the upstream model, and explicit handling of refusal and truncation responses.

- Built a provider abstraction letting the same streaming pipeline run on Claude or on Gemini's free tier, with the structured-output contract carried by the prompt rather than an SDK, so the parser, store and UI are untouched by the swap; model selection is exposed in the UI only for the free provider, and is ignored structurally for the paid one so a client cannot choose what the owner pays for.

- Fixed a latent 400-on-every-request bug by introducing a per-model capability map: the Messages API rejects unsupported parameters outright, and Claude Haiku 4.5 accepts neither the effort ladder nor adaptive thinking, so the handler now builds only the parameters each model supports and degrades unknown models to a request that cannot fail.

- Built a Monaco-based multi-file workspace with severity gutter markers, click-to-reveal navigation from finding to source line, and one-click application of before/after fix diffs.

- Shipped an accessibility-first UI: keyboard operable throughout, `aria-live` streaming announcements, `role="alert"` validation, focus management, and full `prefers-reduced-motion` support.

- Replaced the standard `useState` + `useEffect` hydration gate with a `useSyncExternalStore` hook and derived state, eliminating a class of cascading re-renders flagged by React 19's `set-state-in-effect` rule.

- Delivered a report export layer producing PDF, Markdown, JSON and zipped archives, with all heavy generators dynamically imported so they stay out of the initial bundle.

---

## Skills this evidences

**Frontend** React 19 · Next.js 16 App Router · JavaScript (ES2022) · Tailwind CSS · Radix UI · Zustand · TanStack Query · React Hook Form · Zod · Monaco Editor · Recharts · Framer Motion

**Engineering** Server-Sent Events · streaming parsers · incremental rendering · request cancellation · route handlers · edge middleware · dynamic imports · React Compiler

**AI integration** Anthropic Messages API · Google Gemini REST · provider abstraction · SSE stream parsing · prompt engineering · structured model output · prompt caching · graceful degradation

**Security** CSP and security headers · input validation · rate limiting · secret handling · scope discipline

**Quality** WCAG-aware component design · zero-warning lint and build · GitHub Actions CI · Dockerised deployment

---

## Questions this will get asked

**"Why NDJSON instead of JSON?"**
A JSON document only parses once it's closed, so nothing can render until the response finishes. One object per line parses per line, which is what lets each finding card appear as it's completed. A line that fails to parse is dropped rather than thrown, so one malformed record doesn't kill a review that's already 80% delivered.

**"How did you test the Gemini integration without burning quota?"**
The provider takes its base URL from an env var, so I pointed it at a local server that emits Gemini's exact wire format — `data:`-only SSE, one full `GenerateContentResponse` per chunk, a `thought: true` part first — and asserted the outgoing request too: the `x-goog-api-key` header, `?alt=sse`, and `systemInstruction` as a Content object rather than a bare string. Then I drove it in Chrome and checked the model's findings rendered and that the reasoning part landed in the thinking panel instead of being spliced into a finding. Same technique for the Anthropic capability map: intercept the request per model and assert Haiku gets no `effort` field and the `budget_tokens` form.

**"What happens without an API key?"**
The same pipeline runs against the local rule engine — same SSE frames, same record shapes, same client code path. It isn't a canned response: it runs the real rule engine over the visitor's actual code, seeded from the input hash so it's reproducible. The deployed demo works for anyone, at zero cost per visit.

**"Isn't a regex linter just worse ESLint?"**
It isn't competing with ESLint. It exists so the panel is never empty while the network is in flight, and so the AI review has a deterministic floor it can't fall below. Every rule declares its confidence and the UI shows it, because these are heuristics rather than an AST pass, and claiming otherwise would be dishonest. One bug I hit and fixed: masking string literals before matching silently broke the rules that legitimately match *inside* quotes — `target="_blank"`, a credential assigned to a literal. The pass reported clean files while two security findings sat right there in the source.

**"What did browser testing catch that CI didn't?"**
Two things, both invisible to a passing build and a zero-warning lint. First, the code editor was fetched from a CDN that the app's own Content-Security-Policy blocked — and because the library has no error path, the pane just said "Loading…" indefinitely. I vendored the editor to be served same-origin, then took ownership of its loader so a failure becomes a visible error with a plain-text fallback and a retry, instead of a spinner that never ends. Second, the responsive layout rendered the workspace twice and hid one copy with CSS — but CSS hides a subtree without unmounting it, so every visitor was loading two editor instances. Selecting the layout in JavaScript instead halved the DOM for that view.

The general lesson I took from it: a green build tells you the code compiles, not that the product works. Both bugs needed a real browser.

**"How does cancellation work?"**
Aborting the client fetch closes the response body; the route handler observes `request.signal` and aborts the upstream model request. A cancelled review stops costing money immediately instead of finishing invisibly.

**"There's no login — was that a shortcut?"**
The opposite; it took deleting three working implementations. Every piece of state is per-browser `localStorage`, so a login would have authenticated a user against their own storage — a gate with nothing behind it. I built email/password with PBKDF2 and a signed session, then a server-verified email code flow, then real Google OAuth through Auth.js, and removed all of it once it was clear none of them protected anything.

Removing it deleted three dependencies and a whole class of risk — no password store, no session secret, no OAuth client secret — and turned four server-rendered routes back into static ones, because they were only dynamic to resolve a session. It also removed the last thing standing between a visitor and the product. When there is a backend with real data, authentication comes back with something to protect; before that it is decoration.

**"Why no TypeScript?"**
It was a project constraint. The gap is covered at runtime instead: zod schemas validate at both boundaries, and model output is normalised and type-coerced before it reaches any renderer — because a UI that trusts unvalidated model output is a UI that crashes during a demo.

---

## Demo script — 90 seconds

1. Land on `/review`. The sample file is already loaded, deliberately full of real problems.
2. Press `⌘↵`. Local findings appear instantly, before the network responds.
3. Reasoning streams into its panel; then finding cards start landing one at a time.
4. Click a finding — the editor scrolls to it and highlights the line.
5. Expand it, show the before/after diff, hit **Apply fix** — the editor is patched in place.
6. Filter to Critical only. Export a PDF.
7. Open `/dashboard` to show the score trend across saved reviews.
