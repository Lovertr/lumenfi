'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createCategory } from '@/app/[locale]/(app)/categories/actions';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, ArrowLeftRight } from 'lucide-react';

const ICONS = [
  '💰', '💵', '💴', '💶', '💷', '🪙', '💳', '🏦',
  '🍔', '🍕', '🍜', '🍱', '☕', '🍺', '🥗', '🛒',
  '🚗', '🚕', '🚌', '🚆', '✈️', '⛽', '🚲', '🛵',
  '🏠', '🛏️', '💡', '💧', '📺', '📱', '💻', '🎮',
  '👕', '👗', '👟', '💄', '💍', '🎒', '⌚', '🕶️',
  '🏥', '💊', '🩺', '🦷', '💪', '🧘', '🏋️', '⚽',
  '📚', '🎓', '✏️', '📖', '🔬', '🎨', '🎬', '🎵',
  '🎁', '🎉', '💐', '🎂', '🎄', '✨', '🎯', '🏆',
  '💼', '📊', '📈', '🤝', '✉️', '📞', '🔧', '🛠️',
  '🌳', '🌸', '🐶', '🐱', '🦴', '🍃', '☀️', '🌙',
];

const COLORS = [
  '#EF4444', '#F59E0B', '#FBBF24', '#10B981',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
  '#14B8A6', '#84CC16', '#F97316', '#A855F7',
  '#6B7280', '#0F172A', '#92400E', '#7C2D12',
];

type Type = 'expense' | 'income' | 'both';
type State = { error?: string } | null;

function SubmitBtn() {
  const t = useTranslations('Accounts.form');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? t('submitting') : t('submit')}
    </Button>
  );
}

export function NewCategoryForm() {
  const [state, action] = useFormState<State, FormData>(createCategory, null);
  const [type, setType] = useState<Type>('expense');
  const [icon, setIcon] = useState('💰');
  const [color, setColor] = useState('#3B82F6');

  return (
    <form action={action} className="space-y-5">
      {/* Type tabs */}
      <input type="hidden" name="type" value={type} />
      <div className="space-y-2">
        <Label>ประเภท / Type</Label>
        <div className="grid grid-cols-3 gap-2 rounded-xl border bg-muted/40 p-1">
          {([
            { v: 'expense', label: 'รายจ่าย', icon: TrendingDown, c: 'text-red-600 bg-red-50' },
            { v: 'income', label: 'รายรับ', icon: TrendingUp, c: 'text-green-600 bg-green-50' },
            { v: 'both', label: 'ทั้งคู่', icon: ArrowLeftRight, c: 'text-blue-600 bg-blue-50' },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const active = type === tab.v;
            return (
              <button
                key={tab.v}
                type="button"
                onClick={() => setType(tab.v)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active ? `${tab.c} shadow-sm` : 'text-muted-foreground hover:bg-background'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">ชื่อหมวดหมู่ / Name</Label>
        <Input id="name" name="name" required maxLength={50} placeholder="เช่น ของฝาก, ค่าน้องหมา" autoFocus />
      </div>

      {/* Icon picker */}
      <div className="space-y-2">
        <Label>ไอคอน / Icon</Label>
        <input type="hidden" name="icon" value={icon} />
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-3 flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
              style={{ backgroundColor: `${color}1A` }}
            >
              {icon}
            </div>
            <p className="text-sm text-muted-foreground">เลือกไอคอนที่เหมาะกับหมวดของคุณ</p>
          </div>
          <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto">
            {ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-all',
                  icon === i ? 'bg-primary/15 ring-2 ring-primary' : 'hover:bg-muted'
                )}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Color picker */}
      <div className="space-y-2">
        <Label>สี / Color</Label>
        <input type="hidden" name="color" value={color} />
        <div className="grid grid-cols-8 gap-2">
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

      {state?.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <SubmitBtn />
    </form>
  );
}
