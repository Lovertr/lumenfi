'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { requestPasswordReset } from '@/app/[locale]/(auth)/actions';
import { CheckCircle2 } from 'lucide-react';

type State = { error?: string; success?: boolean } | null;

function SubmitBtn() {
  const t = useTranslations('Auth');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? t('submitting') : t('sendResetLink')}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const t = useTranslations('Auth');
  const tErr = useTranslations('Auth.errors');
  const [state, action] = useFormState<State, FormData>(requestPasswordReset, null);

  if (state?.success) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <p className="mt-2 font-semibold">{t('resetEmailSent')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('resetEmailSentHint')}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" name="email" type="email" placeholder={t('emailPlaceholder')} required />
      </div>
      {state?.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {tErr(state.error)}
        </p>
      )}
      <SubmitBtn />
    </form>
  );
}
