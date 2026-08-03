'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, ShieldCheck, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label, Field } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch, Skeleton } from '@/components/ui/misc';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useSettingsStore } from '@/store/settings-store';
import { providerForKey, PROVIDER_LABELS } from '@/lib/ai/providers/detect';
import { FREE_GEMINI_MODELS, DEFAULT_GEMINI_MODEL } from '@/lib/ai/providers/models';
import { useHistoryStore } from '@/store/history-store';
import { useIsHydrated } from '@/hooks/use-is-hydrated';
import { REVIEW_PROFILES } from '@/lib/constants';

/** Says which of the three states the model control is in, and why. */
function modelHint(health) {
  if (health?.modelSelectable) {
    return "All of these are on Google's free tier. Lighter models use less of your daily quota.";
  }
  if (health?.provider === 'anthropic') {
    return 'Set by the server via ANTHROPIC_MODEL. Claude is billed per token, so the model is not visitor-selectable.';
  }
  return 'Add a free Google AI Studio key — below, or as GEMINI_API_KEY in .env.local — to run a real model and choose between them.';
}

export function SettingsView() {
  const [showKey, setShowKey] = useState(false);
  // Lazy initialiser reads the persisted key once, at first render.
  const [keyDraft, setKeyDraft] = useState(() => useSettingsStore.getState().apiKey);
  const [health, setHealth] = useState(null);

  const { theme, setTheme } = useTheme();
  const settings = useSettingsStore();
  const clearHistory = useHistoryStore((s) => s.clear);
  const reviewCount = useHistoryStore((s) => s.reviews.length);

  const mounted = useIsHydrated();

  useEffect(() => {
    // Tells the user whether the deployment has a server key, without ever
    // exposing the key itself. setState lands in a promise callback, so it
    // schedules a render rather than cascading one inside the effect.
    let cancelled = false;
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mounted) {
    return (
      <div className="container max-w-3xl space-y-4 py-8">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  const saveKey = () => {
    const trimmed = keyDraft.trim();
    const provider = providerForKey(trimmed);

    if (trimmed && !provider) {
      toast.error('That key was not recognised', {
        description: 'Anthropic keys start sk-ant-, Google AI Studio keys start AIza.',
      });
      return;
    }

    settings.setApiKey(trimmed);
    toast.success(
      trimmed ? `${PROVIDER_LABELS[provider]} key saved to this browser` : 'API key removed'
    );
  };

  return (
    <div className="container max-w-3xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything here is stored in this browser only.
        </p>
      </div>

      {/* ---------------------------------------------------- review engine */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Review engine
          </CardTitle>
          <CardDescription>
            {health?.mode === 'live'
              ? `Reviews run on ${health.model} via ${PROVIDER_LABELS[health.provider] ?? health.provider}.`
              : 'No API key is configured, so reviews run on the local analysis engine. Add a free Google AI Studio key below, or in .env.local, to use a real model.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <Field
            label="Default depth"
            htmlFor="profile"
            hint="Deeper passes reason longer and find subtler issues."
          >
            <Select value={settings.profile} onValueChange={settings.setProfile}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REVIEW_PROFILES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label} — {config.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Always rendered, so the control is discoverable, but only usable
              where every option is free — see providers/models.js. Hiding it
              outright made people think the feature did not exist; a disabled
              control that says *why* is honest and findable. */}
          <Field label="Model" htmlFor="model" hint={modelHint(health)}>
            {health?.modelSelectable ? (
              <Select
                value={settings.model || health.model || DEFAULT_GEMINI_MODEL}
                onValueChange={settings.setModel}
              >
                <SelectTrigger id="model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREE_GEMINI_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.label} — {model.hint}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="model"
                readOnly
                disabled
                value={health?.model ?? 'Local analysis engine (no model)'}
              />
            )}
          </Field>

          {health?.byoKeyAllowed !== false ? (
            <>
              <Separator />

              <div className="space-y-2">
                <Label htmlFor="api-key">Your own API key (optional)</Label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="api-key"
                      type={showKey ? 'text' : 'password'}
                      value={keyDraft}
                      onChange={(event) => setKeyDraft(event.target.value)}
                      placeholder="sk-ant-… or AIza…"
                      autoComplete="off"
                      spellCheck={false}
                      className="pr-10 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-0 top-0 grid h-9 w-10 place-items-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={showKey ? 'Hide API key' : 'Show API key'}
                      aria-pressed={showKey}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button onClick={saveKey}>Save</Button>
                </div>

                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Held in this browser&rsquo;s local storage and sent with each review request over
                  HTTPS. It is never written to a server, a log, or your review history.
                </p>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------ appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance &amp; editor</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <Field label="Theme" htmlFor="theme">
            <Select value={theme ?? 'system'} onValueChange={setTheme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">Match system</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={`Editor font size — ${settings.editorFontSize}px`} htmlFor="font-size">
            <input
              id="font-size"
              type="range"
              min={11}
              max={18}
              step={1}
              value={settings.editorFontSize}
              onChange={(event) => settings.update({ editorFontSize: Number(event.target.value) })}
              className="w-full accent-primary"
            />
          </Field>

          <Separator />

          <ToggleRow
            id="word-wrap"
            label="Wrap long lines"
            description="Soft-wrap in the editor instead of scrolling horizontally."
            checked={settings.editorWordWrap}
            onCheckedChange={(v) => settings.update({ editorWordWrap: v })}
          />

          <ToggleRow
            id="minimap"
            label="Show minimap"
            description="Monaco's document overview on the right edge."
            checked={settings.editorMinimap}
            onCheckedChange={(v) => settings.update({ editorMinimap: v })}
          />

          <ToggleRow
            id="static-findings"
            label="Run the local pre-pass"
            description="Deterministic rules fire the moment you paste, before the model responds."
            checked={settings.showStaticFindings}
            onCheckedChange={(v) => settings.update({ showStaticFindings: v })}
          />

          <ToggleRow
            id="reasoning"
            label="Show reasoning"
            description="Stream the model's summarised thinking into a collapsible panel."
            checked={settings.showReasoning}
            onCheckedChange={(v) => settings.update({ showReasoning: v })}
          />

          <ToggleRow
            id="auto-scroll"
            label="Follow new findings"
            description="Keep the newest finding in view while a review streams."
            checked={settings.autoScrollFindings}
            onCheckedChange={(v) => settings.update({ autoScrollFindings: v })}
          />
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------ data */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base">Data</CardTitle>
          <CardDescription>
            Reviews, accounts and preferences all live in this browser&rsquo;s storage.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              settings.reset();
              toast.success('Preferences reset to defaults');
            }}
          >
            <RotateCcw />
            Reset preferences
          </Button>

          <Button
            variant="destructive"
            disabled={!reviewCount}
            onClick={() => {
              clearHistory();
              toast.success('Review history cleared');
            }}
          >
            <Trash2 />
            Delete {reviewCount} saved review{reviewCount === 1 ? '' : 's'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({ id, label, description, checked, onCheckedChange }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
