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

  // If signed up via an agent invite link, bind the user to that agent.
  // Uses the same lookup as the /i/[code] page so it stays in sync.
  const inviteCode = (formData.get('invite') as string | null)?.trim();
  if (data.user && inviteCode) {
    try {
      const { data: agent } = await supabase
        .from('agents')
        .select('id, status')
        .eq('invite_code', inviteCode)
        .eq('status', 'active')
        .maybeSingle();
      if (agent && (agent as any).id) {
        await supabase
          .from('profiles')
          .update({ assigned_agent_id: (agent as any).id })
          .eq('id', data.user.id);
      }
    } catch (e: any) {
      // Don't block signup if the invite assignment fails — admin can fix manually.
      console.warn('[signUp] invite bind failed:', e?.message ?? e);
    }
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


export async function resendConfirmationEmail(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const email = (formData.get('email') as string)?.trim();
  if (!emailSchema.safeParse(email).success) return { error: 'invalid_email' };

  const headersList = await headers();
  const origin =
    headersList.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';

  const supabase = createClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    // Supabase rate-limits resend (usually 60s cooldown)
    const m = error.message?.toLowerCase() ?? '';
    if (m.includes('rate') || m.includes('seconds')) return { error: 'rate_limited' };
    return { error: 'send_failed' };
  }
  return { ok: true };
}

export async function signInWithMagicLink(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const email = (formData.get('email') as string)?.trim();
  if (!emailSchema.safeParse(email).success) return { error: 'invalid_email' };

  const headersList = await headers();
  const origin =
    headersList.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: false, // only existing users — sign-up should use signUpWithEmail
    },
  });
  if (error) {
    const m = error.message?.toLowerCase() ?? '';
    if (m.includes('rate') || m.includes('seconds')) return { error: 'rate_limited' };
    if (m.includes('not found')) return { error: 'user_not_found' };
    return { error: 'send_failed' };
  }
  return { ok: true };
}
