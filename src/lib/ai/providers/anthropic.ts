import type { ChatMessage, ChatResponse } from '../types';

// Anthropic deprecated the '-latest' alias. Use specific model versions
// in a fallback chain to be robust against model availability changes.
const MODELS = [
  'claude-sonnet-4-5',       // Sonnet 4.5 (good balance)
  'claude-3-5-sonnet-20241022', // Sonnet 3.5 fallback (widely available)
  'claude-3-5-haiku-20241022',  // Haiku fallback (cheaper)
];

export async function anthropicChat(
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string,
  maxTokens?: number
): Promise<ChatResponse> {
  const userMessages = messages.filter((m) => m.role !== 'system');

  let lastError: Error | null = null;

  for (const model of MODELS) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens ?? 8192,
          system: systemPrompt,
          messages: userMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (res.status === 404) {
        // Model not available — try next
        lastError = new Error(`${model} 404 not_found`);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      const text = data.content?.[0]?.text ?? '';
      return {
        text,
        usage: {
          inputTokens: data.usage?.input_tokens ?? 0,
          outputTokens: data.usage?.output_tokens ?? 0,
        },
      };
    } catch (e: any) {
      lastError = e;
      // If the error wasn't a 404 (e.g. 401 invalid key, network), don't retry
      if (e?.message && !e.message.includes('404')) {
        throw e;
      }
    }
  }

  throw lastError ?? new Error('Anthropic: all models unavailable');
}
