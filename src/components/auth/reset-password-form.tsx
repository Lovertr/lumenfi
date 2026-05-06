'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { updatePassword } from '@/app/[locale]/(auth)/actions';

type State = { error?: string } | null;

function SubmitBtn() {
  const t = useTranslations('Auth');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? t('submitting') : t('updatePassword')}
    </Button>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations('Auth');
  const tErr = useTranslations('Auth.errors');
  const [state, action] = useFormState<State, FormData>(updatePassword, null);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">{t('newPassword')}</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required />
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
