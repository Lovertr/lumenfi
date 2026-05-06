'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const emailSchema = z.string().email();
const passwordSchema = z.string().min(8);
const nameSchema = z.string().min(1).max(100);

function mapAuthError(message: string | undefined): string {
  if (!message) return 'generic';
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'invalid_credentials';
  if (lower.includes('user already registered')) return 'user_exists';
  if (lower.includes('password') && lower.includes('weak')) return 'weak_password';
  if (lower.includes('email')) return 'invalid_email';
  return 'generic';
}

export async function signInWithEmail(_prev: unknown, formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');

  if (!emailSchema.safeParse(email).success) {
    return { error: 'invalid_email' as const };
  }
  if (!passwordSchema.safeParse(password).success) {
    return { error: 'weak_password' as const };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email as string,
    password: password as string,
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signUpWithEmail(_prev: unknown, formData: FormData) {
  const fullName = formData.get('fullName');
  const email = formData.get('email');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  if (!nameSchema.safeParse(fullName).success) {
    return { error: 'name_required' as const };
  }
  if (!emailSchema.safeParse(email).success) {
    return { error: 'invalid_email' as const };
  }
  if (!passwordSchema.safeParse(password).success) {
    return { error: 'weak_password' as const };
  }
  if (password !== confirmPassword) {
    return { error: 'passwords_dont_match' as const };
  }

  const headersList = await headers();
  const origin = headersList.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email as string,
    password: password as string,
    options: {
      data: { full_name: fullName as string },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  // If email confirmation required → show success page
  if (data.user && !data.session) {
    return { success: 'check_email' as const };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signInWithGoogle() {
  const headersList = await headers();
  const origin = headersList.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(mapAuthError(error.message))}`);
  }
  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

// ─────────────────────────────────────────────────────────
// Password reset flow
// ─────────────────────────────────────────────────────────

export async function requestPasswordReset(_prev: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  if (!emailSchema.safeParse(email).success) {
    return { error: 'invalid_email' as const };
  }

  const supabase = createClient();
  const origin = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }
  return { success: true as const };
}

export async function updatePassword(_prev: unknown, formData: FormData) {
  const password = formData.get('password') as string;
  const confirm = formData.get('confirmPassword') as string;
  if (!passwordSchema.safeParse(password).success) {
    return { error: 'weak_password' as const };
  }
  if (password !== confirm) {
    return { error: 'passwords_dont_match' as const };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthorized' as const };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: mapAuthError(error.message) };

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}
