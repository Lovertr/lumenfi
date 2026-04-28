import type { ChatMessage, ChatResponse } from '../types';

export async function openaiChat(
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string,
  baseUrl = 'https://api.openai.com/v1'
): Promise<ChatResponse> {
  const allMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.filter((m) => m.role !== 'system'),
  ];

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: allMessages,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  return {
    text,
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    },
  };
}

export async function openrouterChat(
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string
): Promise<ChatResponse> {
  return openaiChat(apiKey, messages, systemPrompt, 'https://openrouter.ai/api/v1');
}
