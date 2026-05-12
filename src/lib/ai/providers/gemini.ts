import type { ChatMessage, ChatResponse } from '../types';

// Gemini 1.5 models were deprecated. Use 2.5 flash (free tier, fast).
// Fallback chain handles model availability differences across regions/keys.
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];

export async function geminiChat(
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string,
  maxTokens?: number
): Promise<ChatResponse> {
  const userMessages = messages.filter((m) => m.role !== 'system');

  const contents = userMessages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  let lastError: Error | null = null;

  for (const model of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: maxTokens ?? 8192 },
        }),
      });

      if (res.status === 404) {
        // Model not available, try next
        lastError = new Error(`${model} 404`);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      return {
        text,
        usage: {
          inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        },
      };
    } catch (e) {
      lastError = e as Error;
      // Only retry on 404; other errors fail immediately
      if (!(lastError.message?.includes('404'))) throw lastError;
    }
  }

  throw lastError ?? new Error('All Gemini models failed');
}
