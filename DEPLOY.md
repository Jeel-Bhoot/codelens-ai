# Deploying Critiq for £0

This project is designed to deploy and run at zero cost, permanently. No API key, no card, no trial that expires.

Read this once before you deploy — the default configuration is the free one, but there is a way to get it wrong that costs real money.

---

## The short version

```bash
# 1. Push to GitHub
git init
git add -A
git commit -m "Critiq — AI frontend code reviewer"
git branch -M main
git remote add origin https://github.com/<you>/critiq.git
git push -u origin main

# 2. Import at vercel.com/new — accept every default
# 3. Set NO environment variables
# 4. Deploy
```

That's it. The app runs the local analysis engine, streams findings exactly as the live path does, and costs nothing per visitor.

---

## The one mistake that costs money

**Do not put `ANTHROPIC_API_KEY` in your Vercel environment variables.**

If you do, every visitor — recruiters, crawlers, scrapers, anyone who finds the link — runs reviews on your account. There is per-IP rate limiting in [`rate-limit.js`](src/lib/rate-limit.js), but that caps abuse; it does not prevent spend.

If you want a belt-and-braces guarantee, set this one variable on the deployed environment:

```
NEXT_PUBLIC_FORCE_DEMO_MODE=true
```

That forces the local engine even if a key is somehow present — an accidental paste, a key inherited from a template, a teammate adding one. It is the only environment variable worth setting on a public deploy.

---

## What visitors get in demo mode

The identical pipeline. Not a stub, not a screenshot.

| | Demo mode | Live mode |
|---|---|---|
| Streaming SSE frames | ✅ identical | ✅ |
| Findings appear one at a time | ✅ | ✅ |
| Reasoning panel streams | ✅ | ✅ |
| Severity, line numbers, categories | ✅ | ✅ |
| Editor gutter markers, click-to-reveal | ✅ | ✅ |
| Score, history, dashboard charts | ✅ | ✅ |
| PDF / Markdown / JSON / Zip export | ✅ | ✅ |
| Suggested fix **diffs** | partial — rule-based fixes only | ✅ full before/after |
| Prose written per-codebase | templated + rule-derived | ✅ genuinely generated |

The gap is narrow and it is in the right place: everything structural works, and the part that genuinely needs a model is the part that degrades.

Visitors can also paste **their own** key in Settings and get live Claude on their own account. That's on by default (`NEXT_PUBLIC_ALLOW_BYO_KEY`), and their key is held in their browser only.

---

## Hosting, free tiers

| Host | Free tier | Notes |
|---|---|---|
| **Vercel** | Hobby — free for personal, non-commercial | The natural home for Next.js. Zero config. **Recommended.** |
| **Netlify** | Free tier | Needs `@netlify/plugin-nextjs`. Works, slightly more setup. |
| **Cloudflare Pages** | Free tier | Requires the Next-on-Pages adapter; the streaming route needs checking under Workers. |
| **Render / Railway** | Limited free | Containers sleep when idle — a cold start during a demo is a bad look. |

Vercel Hobby is free for personal portfolio use. Read their fair-use terms if the project ever becomes commercial.

The included [`Dockerfile`](Dockerfile) is there to demonstrate you can containerise a Next.js app — multi-stage, non-root user, healthcheck. You don't need to use it to deploy.

---

## Running live mode locally

For your own testing, and to record a demo.

```bash
cp .env.example .env.local
```

```bash
ANTHROPIC_API_KEY=sk-ant-api03-…
ANTHROPIC_MODEL=claude-sonnet-5     # cheaper than Opus, currently on intro pricing
ANTHROPIC_EFFORT=medium             # less thinking, less spend
```

```bash
npm run dev
```

Confirm it took:

```bash
curl -s http://localhost:3000/api/health
# {"status":"ok","mode":"live","model":"claude-sonnet-5",…}
```

The workspace badge changes from **Demo mode** to **Live**.

`.env.local` is already gitignored. If you ever paste a key into a screenshot, a commit, or a chat window, rotate it in the console immediately and assume it's burned.

---

## Recording the demo (do this — it's your proof)

You need about 60 seconds of screen capture showing the real thing working. This is what you link from your CV and what you show if the live site is in demo mode.

**Tools, all free:** macOS `⇧⌘5` · Windows Xbox Game Bar `⊞G` · OBS Studio · Loom free tier.

**Script:**

1. Open the site. The landing CTA goes straight to `/review` — no account, no wall.
2. Press `⌘↵`. **Pause on this** — local findings appear before the network responds. That's the bit worth calling out.
3. Reasoning streams into its panel. Then finding cards start landing one at a time.
4. Click a finding — the editor scrolls to it and highlights the line.
5. Expand it, show the before/after diff, click **Apply fix**. The editor is patched in place.
6. Filter to Critical only.
7. Export a PDF, show it.
8. Open `/dashboard` for the score trend.

Keep it under 90 seconds. No voiceover needed — captions are enough, and they work on a muted autoplay in a browser tab.

Host it on YouTube unlisted or Loom, and link it from the README and your CV.

---

## What to say about it

If someone asks why the public deploy isn't hitting a live model:

> "The Anthropic integration is fully built — streaming, prompt caching, cancellation propagated upstream, refusal handling. I gated the public deploy to the local analysis engine so the demo can't rate-limit or run up cost on my account. Here it is running live locally."

That is a stronger answer than "here's my API key burning money." It shows you thought about cost, abuse and reliability — which is most of what production engineering actually is.

Do **not** water down the CV bullet. The integration is real. Where you point it at deploy time is a configuration decision.

---

## Pre-flight checklist

```bash
npm run lint      # must be silent — zero errors, zero warnings
npm run build     # must compile with no warnings
npm run start     # then click through every route
```

- [ ] `.env.local` is **not** committed — `git status` shows it ignored
- [ ] No API key in Vercel environment variables
- [ ] `NEXT_PUBLIC_FORCE_DEMO_MODE=true` set on the deployed environment
- [ ] `NEXT_PUBLIC_SITE_URL` set to the real deployed URL (metadata and OG tags)
- [ ] Deployed site loads, and a review streams end to end
- [ ] `/api/health` reports `"mode":"demo"`
- [ ] Demo video recorded and linked from the README
- [ ] README GitHub link updated to your actual repository

---

## Troubleshooting

**Reviews never start on the deployed site.** Check the function logs in Vercel. The review route is `runtime = 'nodejs'` and must not be forced to edge.

**The stream arrives all at once at the end.** Something is buffering. The route already sets `X-Accel-Buffering: no` and `Cache-Control: no-transform`; if you put a CDN or proxy in front of it, it must not buffer `text/event-stream`.

**`/api/health` says `"mode":"live"` when you didn't intend it.** An `ANTHROPIC_API_KEY` is set somewhere in that environment. Remove it, or set `NEXT_PUBLIC_FORCE_DEMO_MODE=true`.

**Build fails on Vercel but works locally.** Check the Node version — this project needs 20.9+. Set it under Project Settings → General → Node.js Version.
