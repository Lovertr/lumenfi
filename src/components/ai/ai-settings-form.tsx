'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveAIKey, removeAIKey } from '@/app/[locale]/(app)/ai/actions';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';

const PROVIDERS = [
  { value: 'anthropic', placeholder: 'sk-ant-...' },
  { value: 'openai', placeholder: 'sk-...' },
  { value: 'gemini', placeholder: 'AIza...' },
  { value: 'openrouter', placeholder: 'sk-or-...' },
] as const;

type State = { error?: string; success?: boolean } | null;

function SubmitBtn() {
  const t = useTranslations('AI.settings');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? '...' : t('save')}
    </Button>
  );
}

export function AISettingsForm({
  currentProvider,
  hasKey,
  privacyMode,
}: {
  currentProvider: string | null;
  hasKey: boolean;
  privacyMode: boolean;
}) {
  const t = useTranslations('AI.settings');
  const tProv = useTranslations('AI.settings.providers');
  const [state, action] = useFormState<State, FormData>(saveAIKey, null);
  const [provider, setProvider] = useState(currentProvider ?? 'anthropic');
  const [showKey, setShowKey] = useState(false);

  const placeholder = PROVIDERS.find((p) => p.value === provider)?.placeholder ?? 'sk-...';

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="provider">{t('provider')}</Label>
        <select
          id="provider"
          name="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-base"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {tProv(p.value)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="api_key">{t('apiKey')}</Label>
        <div className="relative">
          <Input
            id="api_key"
            name="api_key"
            type={showKey ? 'text' : 'password'}
            placeholder={hasKey ? '•••••• (saved — leave blank to keep)' : placeholder}
            className="pr-11 font-mono"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowKey((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{t('apiKeyHint')}</p>
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
        <div className="text-sm">
          <Label htmlFor="privacy_mode" className="cursor-pointer">
            {t('privacyMode')}
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">{t('privacyModeHint')}</p>
        </div>
        <input
          id="privacy_mode"
          name="privacy_mode"
          type="checkbox"
          defaultChecked={privacyMode}
          className="h-5 w-5 rounded border-input accent-primary"
        />
      </div>

      {state?.success && (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          {t('saved')}
        </div>
      )}
      {state?.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <SubmitBtn />

      {hasKey && (
        <form action={removeAIKey}>
          <Button type="submit" variant="ghost" size="sm" className="w-full text-destructive hover:bg-destructive/10">
            {t('remove')}
          </Button>
        </form>
      )}
    </form>
  );
}
