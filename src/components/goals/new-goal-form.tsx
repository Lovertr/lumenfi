'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createGoal } from '@/app/[locale]/(app)/goals/actions';
import { cn } from '@/lib/utils';

const PRESETS = [
  { key: 'emergency', icon: '🛡️', color: '#EF4444', isEmergency: true },
  { key: 'downpayment', icon: '🏠', color: '#8B5CF6' },
  { key: 'car', icon: '🚗', color: '#3B82F6' },
  { key: 'education', icon: '📚', color: '#06B6D4' },
  { key: 'retirement', icon: '🌅', color: '#F59E0B' },
  { key: 'travel', icon: '✈️', color: '#10B981' },
  { key: 'wedding', icon: '💍', color: '#EC4899' },
  { key: 'business', icon: '💼', color: '#0F172A' },
  { key: 'custom', icon: '🎯', color: '#6B7280' },
] as const;

type State = { error?: string } | null;

function SubmitBtn() {
  const t = useTranslations('Goals.form');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? '...' : t('submit')}
    </Button>
  );
}

export function NewGoalForm() {
  const t = useTranslations('Goals.form');
  const tPreset = useTranslations('Goals.presets');
  const [state, action] = useFormState<State, FormData>(createGoal, null);
  const [preset, setPreset] = useState<typeof PRESETS[number]>(PRESETS[0]);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="icon" value={preset.icon} />
      <input type="hidden" name="color" value={preset.color} />

      {/* Preset picker */}
      <div className="space-y-2">
        <Label>Preset</Label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {PRESETS.map((p) => {
            const active = preset.key === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 transition-all',
                  active ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                )}
              >
                <span className="text-2xl">{p.icon}</span>
                <span className="text-xs font-medium leading-tight">{tPreset(p.key)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">{t('name')}</Label>
        <Input id="name" name="name" required placeholder={t('namePlaceholder')} defaultValue={tPreset(preset.key)} />
      </div>

      {/* Target amount */}
      <div className="space-y-2">
        <Label htmlFor="target_amount">{t('targetAmount')}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
            ฿
          </span>
          <Input
            id="target_amount"
            name="target_amount"
            type="text"
            inputMode="decimal"
            required
            defaultValue="100000"
            className="pl-8"
          />
        </div>
      </div>

      {/* Current amount */}
      <div className="space-y-2">
        <Label htmlFor="current_amount">{t('currentAmount')}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
            ฿
          </span>
          <Input
            id="current_amount"
            name="current_amount"
            type="text"
            inputMode="decimal"
            defaultValue="0"
            className="pl-8"
          />
        </div>
      </div>

      {/* Deadline */}
      <div className="space-y-2">
        <Label htmlFor="deadline">{t('deadline')}</Label>
        <Input id="deadline" name="deadline" type="date" />
      </div>

      {/* Emergency fund toggle */}
      {preset.key === 'emergency' && <input type="hidden" name="is_emergency_fund" value="on" />}

      {state?.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <SubmitBtn />
    </form>
  );
}
