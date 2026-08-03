import Link from 'next/link';
import {
  ArrowRight,
  Zap,
  Accessibility,
  ShieldAlert,
  Component,
  Wrench,
  Bug,
  Radio,
  FileCode2,
  GitCompare,
  Gauge,
  KeyRound,
  Github,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { LandingPreview } from '@/components/landing/landing-preview';
import { APP_NAME, APP_TAGLINE, CATEGORIES } from '@/lib/constants';

const CATEGORY_ICONS = {
  performance: Zap,
  accessibility: Accessibility,
  'best-practices': Component,
  security: ShieldAlert,
  maintainability: Wrench,
  types: Bug,
};

const FEATURES = [
  {
    icon: Radio,
    title: 'Token-level streaming',
    body: 'Findings render the moment the model closes each one — the model emits NDJSON and the client parses per line, so nothing waits for the response to finish.',
  },
  {
    icon: Gauge,
    title: 'Instant local pre-pass',
    body: 'A deterministic rule engine runs in the browser the moment you paste. Real findings in milliseconds, before a single byte hits the network.',
  },
  {
    icon: GitCompare,
    title: 'One-click fixes',
    body: 'Every finding carries a before/after diff. Apply it and the editor is patched in place — no copy-paste round trip.',
  },
  {
    icon: FileCode2,
    title: 'Multi-file workspace',
    body: 'Drag in a folder or paste a component. Findings link straight to the offending line and reveal it in the editor.',
  },
  {
    icon: KeyRound,
    title: 'Works without a key',
    body: 'No API key configured? The same pipeline runs against a local analysis engine, so the demo never dead-ends.',
  },
  {
    icon: ShieldAlert,
    title: 'Keys stay server-side',
    body: 'The Anthropic key lives in a route handler and never reaches the browser. Bring-your-own keys are held in your own storage only.',
  },
];

const repoUrl = process.env.NEXT_PUBLIC_REPO_URL;

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* ------------------------------------------------------------ nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
        <nav
          className="container flex h-16 items-center justify-between"
          aria-label="Primary navigation"
        >
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-sm font-bold text-white">
              C
            </span>
            {APP_NAME}
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="#features">Features</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="#how">How it works</Link>
            </Button>
            <ThemeToggle />
            {/* Straight into the product — it needs no account. Sending a
                first-time visitor to a signup form instead is how you lose
                them before they have seen anything work. */}
            <Button size="sm" asChild>
              <Link href="/review">Open the reviewer</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main id="main" className="flex-1">
        {/* --------------------------------------------------------- hero */}
        <section className="relative overflow-hidden border-b">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-primary/20 blur-[130px]" />

          <div className="container relative py-20 md:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="outline" className="mb-6 gap-1.5 border-primary/30 py-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                Streaming analysis, powered by Claude or Gemini
              </Badge>

              <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Ship frontend code that survives{' '}
                <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                  code review
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
                Paste a component. Watch a principal-level review stream back in real time —
                performance, accessibility, security and React correctness, each with the exact line
                and a fix you can apply in one click.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/review">
                    Try it now — no key needed
                    <ArrowRight />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/dashboard">See the dashboard</Link>
                </Button>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Runs a full analysis pass in your browser even without an API key.
              </p>
            </div>

            <LandingPreview />
          </div>
        </section>

        {/* ----------------------------------------------------- coverage */}
        <section className="border-b py-20" id="coverage">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">Six lenses on every file</h2>
              <p className="mt-3 text-muted-foreground">
                Not a linter with a bigger dictionary. Each pass asks a different question about the
                same code.
              </p>
            </div>

            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(CATEGORIES).map(([key, category]) => {
                const Icon = CATEGORY_ICONS[key];
                return (
                  <li key={key}>
                    <Card className="h-full transition-colors hover:border-primary/40">
                      <CardContent className="flex gap-4 p-6">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                          <h3 className="font-semibold">{category.label}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {category.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ----------------------------------------------------- features */}
        <section className="border-b py-20" id="features">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">Built like a product</h2>
              <p className="mt-3 text-muted-foreground">
                The interesting engineering is in the streaming pipeline and the editor integration,
                not the prompt.
              </p>
            </div>

            <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="rounded-lg border bg-card p-6">
                  <feature.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------------------------------------------- how it works */}
        <section className="border-b py-20" id="how">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">How a review runs</h2>
            </div>

            <ol className="mx-auto mt-12 grid max-w-4xl gap-8 md:grid-cols-4">
              {[
                {
                  step: '01',
                  title: 'Paste or drop',
                  body: 'Files land in a Monaco workspace. A .zip is unpacked in the browser.',
                },
                {
                  step: '02',
                  title: 'Local pass',
                  body: 'Deterministic rules fire immediately — findings before the network responds.',
                },
                {
                  step: '03',
                  title: 'Model streams',
                  body: 'The model reasons, then emits findings as NDJSON. Each one renders as it closes.',
                },
                {
                  step: '04',
                  title: 'Apply or export',
                  body: 'Patch fixes into the editor, or export the report as PDF, JSON or a zip.',
                },
              ].map((item) => (
                <li key={item.step} className="relative">
                  <span className="text-4xl font-bold text-primary/20">{item.step}</span>
                  <h3 className="mt-2 font-semibold">{item.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------------ cta */}
        <section className="py-24">
          <div className="container">
            <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-violet-500/10 px-8 py-16 text-center">
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Find the bug before the reviewer does
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Open the workspace and run a review on the sample component. It takes about ten
                seconds and no signup.
              </p>
              <Button size="lg" className="mt-8" asChild>
                <Link href="/review">
                  Open the workspace
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* --------------------------------------------------------- footer */}
      <footer className="border-t py-10">
        <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <p>
            {APP_NAME} — {APP_TAGLINE}.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/review" className="transition-colors hover:text-foreground">
              Workspace
            </Link>
            <Link href="/dashboard" className="transition-colors hover:text-foreground">
              Dashboard
            </Link>
            {/* Rendered only when the repo URL is configured. A "Source" link
                pointing at github.com's homepage is worse than no link. */}
            {repoUrl ? (
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <Github className="h-4 w-4" aria-hidden="true" />
                Source
              </a>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
