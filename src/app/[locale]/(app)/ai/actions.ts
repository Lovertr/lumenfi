'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';

const VALID_PROVIDERS = ['anthropic', 'openai', 'gemini', 'openrouter'] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

export async function saveAIKey(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const provider = formData.get('provider') as Provider;
  const apiKey = (formData.get('api_key') as string)?.trim();
  const privacyMode = formData.get('privacy_mode') === 'on';

  if (!VALID_PROVIDERS.includes(provider)) {
    return { error: 'invalid_provider' as const };
  }
  if (!apiKey || apiKey.length < 10) {
    return { error: 'invalid_key' as const };
  }

  let encryptedKey: string;
  try {
    encryptedKey = await encrypt(apiKey);
  } catch (e) {
    console.error('encrypt:', e);
    return { error: 'encryption_failed' as const };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      ai_provider: provider,
      ai_api_key_encrypted: encryptedKey,
      ai_privacy_mode: privacyMode,
    })
    .eq('id', user.id);

  if (error) {
    console.error('saveAIKey:', error);
    return { error: 'generic' as const };
  }

  revalidatePath('/ai');
  revalidatePath('/settings');
  return { success: true as const };
}

export async function removeAIKey() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase
    .from('profiles')
    .update({
      ai_provider: null,
      ai_api_key_encrypted: null,
    })
    .eq('id', user.id);

  revalidatePath('/ai');
}
