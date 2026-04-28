'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createGoal, updateGoal, deleteGoal } from '@/app/[locale]/(app)/goals/actions';
import { cn } from '@/lib/utils';
import { Shield, Trash2, Wallet, Link2 } from 'lucide-react';

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

const ALL_ICONS = [
  '🎯', '🛡️', '🏠', '🏡', '🏢', '🚗', '🚙', '🏍️', '✈️', '🛫',
  '📚', '🎓', '✏️', '🔬', '🎨', '🎬', '🎵', '🎮', '🎤', '🎸',
  '🌅', '🌴', '🌊', '⛰️', '🏖️', '🏔️', '🗺️', '📷', '🎒', '🧳',
  '💼', '💰', '💵', '💴', '💶', '💷', '🪙', '💳', '🏦', '📊',
  '💍', '👔', '👗', '👶', '🤱', '👨‍👩‍👧', '🐶', '🐱', '🌸', '🎁',
  '💪', '🧘', '🏋️', '⚽', '🏀', '🎾', '🏊', '🚴', '🥋', '🏆',
  '📱', '💻', '🖥️', '📺', '🎧', '⌚', '🎥', '🚀', '⭐',
  '❤️', '✨', '🔥', '💡', '🌈', '🍀', '☀️', '🌙', '⚡', '💎',
];

const COLORS = [
  '#EF4444', '#F59E0B', '#FBBF24', '#10B981',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
  '#14B8A6', '#84CC16', '#F97316', '#A855F7',
  '#6B7280', '#0F172A',
];

interface GoalDefaults {
  id?: string;
  name?: string;
  icon?: string;
  color?: string;
  target_amount?: number | string;
  current_amount?: number | string;
  deadline?: string | null;
  is_emergency_fund?: boolean;
  linked_account_ids?: string[];
}

interface AccountOption {
  id: string;
  name: string;
  color: string;
  type: string;
}

type State = { error?: string } | null;

function SubmitBtn({ mode }: { mode: 'create' | 'edit' }) {
  const t = useTranslations('Goals.form');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? '...' : mode === 'create' ? t('submit') : t('save')}
    </Button>
  );
}

export function GoalForm({ defaults, mode, accounts = [] }: { defaults?: GoalDefaults; mode: 'create' | 'edit'; accounts?: AccountOption[] }) {
  const t = useTranslations('Goals.form');
  const tPreset = useTranslations('Goals.presets');
  const action = mode === 'create' ? createGoal : updateGoal;
  const [state, formAction] = useFormState<State, FormData>(action, null);

  const [selectedPreset, setSelectedPreset] = useState<string>(mode === 'create' ? 'emergency' : 'custom');
  const [icon, setIcon] = useState<string>(defaults?.icon ?? PRESETS[0].icon);
  const [color, setColor] = useState<string>(defaults?.color ?? PRESETS[0].color);
  const [name, setName] = useState<string>(defaults?.name ?? '');
  const [showAllIcons, setShowAllIcons] = useState(false);
  const [linkedIds, setLinkedIds] = useState<string[]>(defaults?.linked_account_ids ?? []);

  function toggleLink(id: string) {
    setLinkedIds((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function applyPreset(p: typeof PRESETS[number]) {
    setSelectedPreset(p.key);
    setIcon(p.icon);
    setColor(p.color);
    if (!name) {
      setName(tPreset(p.key));
    }
  }

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-5">
      {mode === 'edit' && defaults?.id && (
        <input type="hidden" name="id" value={defaults.id} />
      )}
      <input type="hidden" name="icon" value={icon} />
      <input type="hidden" name="color" value={color} />

      {mode === 'create' && (
        <div className="space-y-2">
          <Label>Preset (เลือกแล้วแก้ได้ทุกอย่าง)</Label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {PRESETS.map((p) => {
              const active = selectedPreset === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p)}
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
      )}

      <div className="space-y-2">
        <Label htmlFor="name">{t('name')}</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder={t('namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>ไอคอน / Icon</Label>
          <button
            type="button"
            onClick={() => setShowAllIcons((s) => !s)}
            className="text-xs text-primary"
          >
            {showAllIcons ? 'ซ่อน' : 'เลือกไอคอนอื่น'}
          </button>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl text-3xl"
              style={{ backgroundColor: `${color}1A` }}
            >
              {icon}
            </div>
            <div className="flex-1 text-sm text-muted-foreground">
              ไอคอนปัจจุบัน — กด "เลือกไอคอนอื่น" เพื่อเปลี่ยน
            </div>
          </div>
          {showAllIcons && (
            <div className="mt-3 grid max-h-44 grid-cols-8 gap-1 overflow-y-auto">
              {ALL_ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-all',
                    icon === i ? 'bg-primary/15 ring-2 ring-primary' : 'hover:bg-background'
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>สี / Color</Label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                'h-9 w-9 rounded-full border-2 transition-all',
                color === c ? 'border-foreground scale-110' : 'border-transparent'
              )}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

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
            defaultValue={defaults?.target_amount?.toString() ?? '100000'}
            className="pl-8"
          />
        </div>
      </div>

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
            defaultValue={defaults?.current_amount?.toString() ?? '0'}
            className="pl-8"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="deadline">{t('deadline')}</Label>
        <Input
          id="deadline"
          name="deadline"
          type="date"
          defaultValue={defaults?.deadline ?? ''}
        />
      </div>

      {/* Linked accounts — auto-sync current_amount from selected accounts' balance */}
      {accounts.length > 0 && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <Label className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            ผูกกับบัญชี (ยอดจะอัปเดตตามบัญชี)
          </Label>
          <p className="text-[11px] text-muted-foreground">
            เลือกบัญชีที่เก็บเงินไว้สำหรับเป้าหมายนี้ — ยอดปัจจุบันจะคำนวณจากผลรวมของบัญชีที่ผูกไว้อัตโนมัติ
          </p>
          {linkedIds.map((id) => (
            <input key={id} type="hidden" name="linked_account_ids" value={id} />
          ))}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {accounts.map((acc) => {
              const active = linkedIds.includes(acc.id);
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => toggleLink(acc.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:bg-muted/40'
                  )}
                >
                  <Wallet className="h-3 w-3" />
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: acc.color }} />
                  {acc.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
        <Label htmlFor="is_emergency_fund" className="cursor-pointer flex items-center gap-2">
          <Shield className="h-4 w-4 text-destructive" />
          เป็นเงินสำรองฉุกเฉิน
        </Label>
        <input
          id="is_emergency_fund"
          name="is_emergency_fund"
          type="checkbox"
          defaultChecked={defaults?.is_emergency_fund ?? selectedPreset === 'emergency'}
          className="h-5 w-5 rounded border-input accent-primary"
        />
      </div>

      {state?.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <SubmitBtn mode={mode} />
      </form>

      {mode === 'edit' && defaults?.id && (
        <form action={deleteGoal}>
          <input type="hidden" name="id" value={defaults.id} />
          <Button
            type="submit"
            variant="ghost"
            size="lg"
            className="w-full text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('delete')}
          </Button>
        </form>
      )}
    </div>
  );
}
