'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GoogleButton } from './google-button';
import { signUpWithEmail } from '@/app/[locale]/(auth)/actions';
import { Mail, Lock, User, CheckCircle2 } from 'lucide-react';

type State = { error?: string; success?: string } | null;

function SubmitButton() {
  const t = useTranslations('Auth');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? t('submitting') : t('submitSignup')}
    </Button>
  );
}

export function SignupForm() {
  const t = useTranslations('Auth');
  const [state, formAction] = useFormState<State, FormData>(signUpWithEmail, null);

  if (state?.success === 'check_email') {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-semibold">{t('checkEmail')}</h2>
        <p className="text-sm text-muted-foreground">{t('checkEmailMessage')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <GoogleButton />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('orContinueWith')}</span>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">{t('fullName')}</Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              placeholder={t('fullNamePlaceholder')}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t('email')}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder={t('emailPlaceholder')}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t('password')}</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder={t('passwordPlaceholder')}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="pl-10"
            />
          </div>
        </div>

        {state?.error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {t(`errors.${state.error}` as any)}
          </div>
        )}

        <SubmitButton />

        <p className="text-center text-xs text-muted-foreground">
          {t('termsAgree')}{' '}
          <Link href="/terms" className="underline hover:text-foreground">{t('terms')}</Link>{' '}
          {t('and')}{' '}
          <Link href="/privacy" className="underline hover:text-foreground">{t('privacy')}</Link>
        </p>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t('login')}
        </Link>
      </p>
    </div>
  );
}
