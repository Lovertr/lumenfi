'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/encryption';
import { chat as aiChat } from '@/lib/ai';
import { buildSuperContext } from '@/lib/ai/super-context';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import type { ChatMessage, AIProvider } from '@/lib/ai';

const VALID_PROVIDERS = ['anthropic', 'openai', 'gemini', 'openrouter'] as const;

// === Settings actions ===

export async function saveAIKey(_prev: unknown, formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const provider = formData.get('provider') as AIProvider;
  const apiKey = (formData.get('api_key') as string)?.trim();
  const privacyMode = formData.get('privacy_mode') === 'on';

  if (!VALID_PROVIDERS.includes(provider)) {
    return { error: 'invalid_provider' as const };
  }

  // Empty key → keep existing key, just update other settings
  if (!apiKey) {
    const { error } = await supabase
      .from('profiles')
      .update({ ai_provider: provider, ai_privacy_mode: privacyMode })
      .eq('id', user.id);
    if (error) return { error: 'generic' as const };
    revalidatePath('/ai');
    return { success: true as const };
  }

  if (apiKey.length < 10) {
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
    .update({ ai_provider: null, ai_api_key_encrypted: null })
    .eq('id', user.id);

  revalidatePath('/ai');
}

// === Chat action ===

interface ChatResult {
  reply?: string;
  error?: string;
}

export async function sendChatMessage(
  history: ChatMessage[],
  userMessage: string,
  locale: string
): Promise<ChatResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'not_authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('ai_provider, ai_api_key_encrypted, ai_privacy_mode')
    .eq('id', user.id)
    .single();

  if (!profile?.ai_provider || !profile?.ai_api_key_encrypted) {
    return { error: 'no_key_configured' };
  }

  let apiKey: string;
  try {
    apiKey = await decrypt(profile.ai_api_key_encrypted);
    if (!apiKey) return { error: 'decryption_failed' };
  } catch {
    return { error: 'decryption_failed' };
  }

  // Build comprehensive context (rich snapshot covering all 12+ domains)
  const context = await buildSuperContext(profile.ai_privacy_mode ?? true);
  const systemPrompt = buildSystemPrompt(locale, context);

  const messages: ChatMessage[] = [
    ...history.slice(-10), // last 10 messages for context window
    { role: 'user', content: userMessage },
  ];

  try {
    const result = await aiChat(profile.ai_provider as AIProvider, apiKey, messages, systemPrompt);
    return { reply: result.text };
  } catch (e: any) {
    console.error('sendChatMessage:', e);
    return { error: e?.message?.slice(0, 200) ?? 'ai_error' };
  }
}

// ─────────────────────────────────────────────────────────
// Conversation history persistence
// ─────────────────────────────────────────────────────────

export async function listConversations() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('ai_conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  return data ?? [];
}

export async function getConversationMessages(conversationId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('ai_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .order('created_at');

  return (data ?? []).map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }));
}

export async function createConversation(firstMessage: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Title = first 60 chars of message
  const title = firstMessage.slice(0, 60).trim() + (firstMessage.length > 60 ? '...' : '');

  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({ user_id: user.id, title })
    .select('id')
    .single();

  if (error) {
    console.error('createConversation:', error);
    return null;
  }
  return data?.id ?? null;
}

export async function appendMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('ai_messages').insert({
    conversation_id: conversationId,
    user_id: user.id,
    role,
    content,
  });

  // Bump updated_at
  await supabase
    .from('ai_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('user_id', user.id);
}

export async function deleteConversation(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase.from('ai_conversations').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/ai');
}
