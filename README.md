# CodeLens AI — AI Frontend Code Reviewer

**CodeLens AI reviews your React and CSS code with AI and shows you exactly what to fix.**

Paste a component (or upload files), click **Run review**, and a detailed code review streams back in real time. Each problem it finds appears as a card, pinned to the exact line, with an explanation and a before/after fix you can apply in one click.

Built with **Next.js 16** and **React 19**, written in **JavaScript**. It runs on **Google Gemini** (free), **Anthropic Claude** (paid), or a built-in local rule engine that needs no API key at all.

---

## Table of contents

- [About the project](#about-the-project)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
  - [Prerequisites](#1-prerequisites)
  - [Installation](#2-installation)
  - [Setup (environment variables)](#3-setup-environment-variables)
  - [Run the app](#4-run-the-app)
- [How to use it](#how-to-use-it)
- [Review engine modes](#review-engine-modes)
- [Environment variables reference](#environment-variables-reference)
- [Available scripts](#available-scripts)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Licence](#licence)

---

## About the project

Code review takes time, and small frontend mistakes (a missing `key` prop, an image with no `alt` text, an unnecessary re-render) are easy to miss. CodeLens AI acts like a senior frontend reviewer that is always available.

It checks your code through **six lenses**:

| Lens                     | Examples of what it catches                                  |
| ------------------------ | ------------------------------------------------------------ |
| **Performance**          | Unnecessary re-renders, expensive work inside render         |
| **Accessibility**        | Missing `alt` text, unlabeled inputs, keyboard traps         |
| **React best practices** | Missing `key` props, misused hooks, derived state in effects |
| **Security**             | `dangerouslySetInnerHTML`, `eval`, hard-coded secrets        |
| **Maintainability**      | Overly large components, duplicated logic                    |
| **Correctness**          | Loose equality, logic bugs, unhandled edge cases             |

Every finding includes a **severity** (critical → low), the **file and line number**, **why it matters**, and a **concrete fix**. The review also gives your code an overall **quality score from 0 to 100**.

**No sign-up required.** All your files, history and settings are stored in your own browser. Nothing is saved on a server.

---

## Features

| Feature                 | What it means                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------- |
| **Live streaming**      | Each finding appears as soon as the AI writes it, so you don't wait for the full reply |
| **Instant local pass**  | A built-in rule engine checks your code in the browser within ~5 ms                    |
| **One-click fixes**     | Each fix is shown as a diff; apply it and the editor updates in place                  |
| **Multi-file upload**   | Drag in files or a `.zip`; each finding links back to the right line                   |
| **Reasoning panel**     | See the AI's summarised thinking in a collapsible side panel                           |
| **Score and history**   | 0–100 quality score, saved past reviews and trend charts on a dashboard                |
| **Export**              | Download the review as PDF, Markdown, JSON or a zip of report + source                 |
| **Works without a key** | Demo mode uses the local engine, so every feature works with no setup                  |
| **Dark / light theme**  | Theme toggle, plus a command palette (`Ctrl+K`)                                        |

---

## Tech stack

| Area         | Tools                                                         |
| ------------ | ------------------------------------------------------------- |
| Framework    | Next.js 16 (App Router), React 19                             |
| Language     | JavaScript (with `zod` for runtime validation)                |
| Styling      | Tailwind CSS, Radix UI primitives, `class-variance-authority` |
| Code editor  | Monaco Editor (the editor that powers VS Code)                |
| State        | Zustand (saved to `localStorage`)                             |
| AI providers | Google Gemini API, Anthropic Claude API                       |
| Charts       | Recharts                                                      |
| Export       | jsPDF, JSZip, file-saver                                      |
| Tooling      | ESLint, Prettier, React Compiler                              |

---

## Getting started

Follow these steps to run the project on your own computer.

### 1. Prerequisites

You need:

- **Node.js 20.9 or newer.** Download it from [nodejs.org](https://nodejs.org/). Check your version with:
  ```bash
  node -v
  ```
- **npm**, which comes with Node.js.
- **Git**, to clone the repository ([git-scm.com](https://git-scm.com/)).
- _(Optional)_ A free **Gemini API key** if you want real AI reviews instead of demo mode. See [step 3](#3-setup-environment-variables).

### 2. Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/Jeel-Bhoot/codelens-ai.git
cd codelens-ai
npm install
```

`npm install` also runs a small script ([`scripts/copy-monaco.mjs`](scripts/copy-monaco.mjs)) that copies the Monaco code editor into `public/monaco`. This lets the editor load from your own server instead of a CDN. You don't need to do anything extra.

### 3. Setup (environment variables)

**This step is optional.** With no setup, the app runs in **demo mode** and every feature still works. The reviews come from the local rule engine instead of a real AI model.

To get **real AI reviews for free** with Google Gemini:

1. Get a free API key (no credit card) at **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)**.
2. Copy the example environment file:

   ```bash
   # macOS / Linux / Git Bash
   cp .env.example .env.local

   # Windows PowerShell
   Copy-Item .env.example .env.local
   ```

3. Open `.env.local` and paste your key:

   ```env
   GEMINI_API_KEY=your-key-here
   ```

4. Save the file and restart the dev server if it is already running.

> **Keep your keys secret.** `.env.local` is already listed in `.gitignore`, so it will never be pushed to GitHub. Never add `NEXT_PUBLIC_` in front of an API key name, because that would expose it to the browser.

To use **Anthropic Claude** (paid) instead, see [Review engine modes](#review-engine-modes).

### 4. Run the app

Start the development server:

```bash
npm run dev
```

Then open **[http://localhost:3000](http://localhost:3000)** in your browser.

To run an optimised production build instead:

```bash
npm run build
npm run start
```

To check which AI provider is active, open [http://localhost:3000/api/health](http://localhost:3000/api/health). It shows the provider and model but never the key.

---

## How to use it

1. Open the app and go to **Review**.
2. **Add code** in one of three ways:
   - paste code straight into the editor,
   - drag and drop files or a `.zip` onto the file manager, or
   - load one of the built-in sample components.
3. Click **Run review** (or press `Ctrl+Enter` / `⌘+Enter`).
4. Watch findings appear. Local findings show instantly, and AI findings stream in one by one.
5. Click a finding to jump to its line. Click **Apply fix** to patch the code in the editor.
6. **Export** the review as PDF, Markdown, JSON or a zip.
7. Open **History** to see past reviews and **Dashboard** to see score trends over time.
8. In **Settings** you can choose a different Gemini model, or paste your own API key. A key you paste there is stored only in your browser.

---

## Review engine modes

The app picks a review engine automatically, depending on what you configure:

| Your configuration                               | What runs                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| Nothing (no `.env.local`)                        | **Demo mode.** Local rule engine. Every feature works, but it isn't real AI.   |
| `GEMINI_API_KEY` set                             | **Live AI from Gemini** (`gemini-3.5-flash` by default). Free, no credit card. |
| `ANTHROPIC_API_KEY` + `ALLOW_PAID_PROVIDER=true` | **Live AI from Claude** (`claude-opus-5` by default). Paid per use.            |
| Both Gemini and Anthropic keys set               | **Gemini is used**, because it's free.                                         |
| A visitor pastes their own key in Settings       | Live AI on **their** key. It is kept only in their browser.                    |
| `NEXT_PUBLIC_FORCE_DEMO_MODE=true`               | Demo mode, even if a key is set. Useful for a free public demo.                |

**Why Claude needs two settings:** a key on its own is not treated as permission to spend money. Without `ALLOW_PAID_PROVIDER=true`, a key copied by accident from another project could start billing you silently.

---

## Environment variables reference

Every variable is optional. [`.env.example`](.env.example) has the full list with detailed comments.

| Variable                      | Default                 | What it does                                                            |
| ----------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| `GEMINI_API_KEY`              | _(empty)_               | Free Google Gemini key. Turns on live AI reviews.                       |
| `GEMINI_MODEL`                | `gemini-3.5-flash`      | Default Gemini model. Visitors can switch models in Settings.           |
| `ANTHROPIC_API_KEY`           | _(empty)_               | Anthropic Claude key (paid).                                            |
| `ALLOW_PAID_PROVIDER`         | `false`                 | Must be `true` before the Anthropic key is used.                        |
| `ANTHROPIC_MODEL`             | `claude-opus-5`         | `claude-opus-5`, `claude-sonnet-5` or `claude-haiku-4-5`.               |
| `ANTHROPIC_EFFORT`            | `high`                  | `low` / `medium` / `high` / `xhigh` / `max`. How hard the model thinks. |
| `NEXT_PUBLIC_ALLOW_BYO_KEY`   | `true`                  | Lets visitors paste their own key in Settings.                          |
| `NEXT_PUBLIC_FORCE_DEMO_MODE` | `false`                 | Always use the local engine, even when a key is set.                    |
| `NEXT_PUBLIC_SITE_URL`        | `http://localhost:3000` | Public URL, used in metadata.                                           |
| `NEXT_PUBLIC_REPO_URL`        | _(empty)_               | Your GitHub repo URL. Adds a "Source" link to the footer.               |
| `TRUSTED_PROXY_HOPS`          | `1`                     | Only needed if you self-host behind your own reverse proxy.             |

---

## Available scripts

| Command          | What it does                                            |
| ---------------- | ------------------------------------------------------- |
| `npm run dev`    | Start the development server at `http://localhost:3000` |
| `npm run build`  | Create an optimised production build                    |
| `npm run start`  | Serve the production build (run `build` first)          |
| `npm run lint`   | Check the code with ESLint                              |
| `npm run format` | Format all files with Prettier                          |

---

## Project structure

```
codelens-ai/
├── public/                    static files (Monaco is copied here on install)
├── scripts/copy-monaco.mjs    copies the Monaco editor into public/
├── src/
│   ├── app/
│   │   ├── page.js                landing page
│   │   ├── (app)/                 review · dashboard · history · settings pages
│   │   ├── api/review/route.js    streaming review endpoint (SSE)
│   │   └── api/health/route.js    reports which AI provider is configured
│   ├── components/
│   │   ├── ui/                    buttons, dialogs, inputs (Radix + Tailwind)
│   │   ├── review/                editor, file manager, finding cards, export
│   │   ├── dashboard/             charts and metrics
│   │   ├── history/               saved reviews
│   │   ├── settings/              settings page
│   │   └── layout/                app shell, command palette, theme toggle
│   ├── lib/
│   │   ├── ai/                    prompt, stream parsing, demo reviewer, providers
│   │   ├── analysis/              local rule engine (static-rules.js)
│   │   ├── export/                PDF · Markdown · JSON · Zip reports
│   │   ├── validation/            zod schemas shared by client and server
│   │   ├── samples.js             built-in sample components
│   │   └── scoring.js             0–100 quality score
│   ├── store/                     Zustand stores: review · history · settings
│   └── hooks/                     streaming, uploads, hydration, media query
├── .env.example               template for your .env.local
├── Dockerfile                 container build
├── DEPLOY.md                  detailed deployment guide
└── next.config.mjs            Next.js config and security headers
```

---

## How it works

### Data flow of one review

```
paste / upload code
   ↓
local rule engine ─────────────────► local findings render (~5 ms)
   ↓
POST /api/review   (validated with zod, rate-limited per IP)
   ↓
Gemini or Claude, streamed  (or the demo reviewer if no key)
   ↓
SSE frames: reasoning │ token │ record │ complete
   ↓
NDJSON reader, one finding per line
   ↓
merge + de-duplicate with local findings ─► each card renders as it arrives
   ↓
score · save to history · export
```

### Findings stream one at a time

Most "streaming AI" apps stream plain text. This app streams **structured findings**, so each card appears as soon as it is complete. That takes three pieces.

**1. The model writes NDJSON, not one big JSON document.** A JSON object can only be parsed once it is closed. One JSON object _per line_ can be parsed line by line:

```jsonc
{"type":"summary","overview":"…","strengths":["…"]}
{"type":"finding","severity":"critical","file":"Cart.jsx","line":42,…}
{"type":"finding","severity":"high","file":"Cart.jsx","line":58,…}
{"type":"done","verdict":"…","topPriorities":["…"]}
```

**2. A rolling buffer emits each line once it is complete.** Tokens rarely end exactly on a line break, so [`createNdjsonReader`](src/lib/ai/stream.js) keeps the unfinished tail and passes on every finished line:

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

A line that fails to parse is skipped instead of crashing the review.

**3. The API route sends typed Server-Sent Events.** [`/api/review`](src/app/api/review/route.js) labels each frame (`reasoning`, `token`, `record`, `warning`, `error`, `complete`). That way the client sends reasoning to the thinking panel and review text to the NDJSON reader.

### Two providers, one pipeline

[`src/lib/ai/providers/`](src/lib/ai/providers) has one module per AI service, and all of them return the same stream format. The output format is defined by the _prompt_, not by an SDK, so the parser, store and UI work the same whichever provider runs.

The Gemini module uses plain `fetch`. [`gemini.js`](src/lib/ai/providers/gemini.js) documents three details that break streaming silently:

- `?alt=sse` is required in the URL.
- Every chunk is a full response, not a delta.
- Parts marked `thought: true` are the model's reasoning and must be kept out of the review.

The Anthropic module ([`anthropic.js`](src/lib/ai/providers/anthropic.js)) keeps a per-model capability map, because Claude models don't all accept the same parameters. For example, `claude-haiku-4-5` rejects `effort`, and sending an unsupported parameter fails the request.

### Demo mode uses the same pipeline

Without an API key, the app runs the **same pipeline** against a local engine: the same stream format, client code and UI. It is not a canned response. [`demo-reviewer.js`](src/lib/ai/demo-reviewer.js) runs the real rule engine over your actual code. It is seeded from a hash of the input, so the same code always gives the same review. A deployed demo therefore works fully and costs nothing per visitor.

### The local rule engine

[`static-rules.js`](src/lib/analysis/static-rules.js) has about 20 heuristic rules that run before any request goes out. Local and AI findings are merged and de-duplicated by `(file, category, line ± 3)`. When both report the same issue, the AI version wins because it includes a fix. Each rule declares a `confidence` level and the UI shows it, since regex rules are less precise than a full code parser.

### Prompt design

Two choices in [`prompt.js`](src/lib/ai/prompt.js) make a real difference to quality:

- **"Report everything; we filter later."** Asking a model to report only important issues makes it silently drop real findings. Here severity is a label, not a filter.
- **Line-numbered input.** Each line is sent as `  42 | …` so the model can cite exact lines. The prefix is removed before anything is shown.

The system prompt is identical on every request, so Claude can cache it. Cached input costs about a tenth of the normal price.

### Who can choose the model

Settings shows a **model picker only when the provider is free (Gemini)**. Every model in the allowlist ([`models.js`](src/lib/ai/providers/models.js)) is on the free tier, so a visitor can't run up a bill. The paid Claude model is read only from server environment variables. Any model a visitor sends is ignored. An unknown model id falls back to the default instead of causing an error.

### Cancelling a review stops the cost

When you cancel, the browser aborts its request. The API route notices and aborts the upstream AI request too, so a cancelled review stops costing money immediately.

---

## Security

- API keys are used only on the server and never reach the browser bundle.
- Security headers on every response: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`.
- Every request body is validated with a `zod` schema.
- A per-IP sliding-window rate limit protects the review endpoint.
- Provider errors are mapped to safe messages, so no internal details or keys leak.
- **No accounts on purpose.** All data lives in your browser, so a login would have nothing to protect. That also means there are no passwords, sessions or user tables that could leak.

## Accessibility

Every part of the app works with the keyboard, has a visible focus ring, and starts with a skip link. Form fields have labels. Errors are announced to screen readers with `role="alert"`, and streaming status with `aria-live`. Animations respect `prefers-reduced-motion`. Charts use legends and text labels, not just colour.

---

## Deployment

**Vercel (easiest):** import the GitHub repo at [vercel.com](https://vercel.com) and click deploy. With no environment variables set, the site runs in demo mode and costs nothing. Add `GEMINI_API_KEY` in the Vercel project settings for free live AI.

**Netlify:** a [`netlify.toml`](netlify.toml) is included.

**Docker:**

```bash
docker build -t codelens .
docker run -p 3000:3000 -e GEMINI_API_KEY=your-key-here codelens
```

See **[DEPLOY.md](DEPLOY.md)** for the full guide, including free hosting tiers, the one configuration mistake that costs money, and how to record a demo.

---

## Troubleshooting

| Problem                                         | Fix                                                                                                         |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Reviews say "demo" even though I added a key    | Make sure the file is named `.env.local` (not `.env.example`), then restart `npm run dev`.                  |
| The editor shows "Loading…" or a plain text box | Run `npm install` again (or `npm run vendor:monaco`) to copy Monaco into `public/monaco`.                   |
| Gemini returns 404 "no longer available"        | Use a model listed in `.env.example`, such as `gemini-3.5-flash`. Avoid `gemini-2.5-*` and `*-preview` ids. |
| The Claude key is ignored                       | Set `ALLOW_PAID_PROVIDER=true`, and remove `GEMINI_API_KEY` (Gemini takes priority).                        |
| "Too many reviews requested"                    | The rate limit was hit. Wait a minute and try again.                                                        |
| `npm install` fails                             | Check that `node -v` shows 20.9 or newer.                                                                   |
| My review history is gone                       | History is stored in the browser, so clearing site data deletes it.                                         |

---

## Keyboard shortcuts

| Shortcut        | Action                                  |
| --------------- | --------------------------------------- |
| `Ctrl+K` / `⌘K` | Open the command palette                |
| `Ctrl+↵` / `⌘↵` | Run a review, or cancel one in progress |
| `Esc`           | Close a dialog or the palette           |

---

## Licence

MIT
