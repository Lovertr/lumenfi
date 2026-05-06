// Helper wrapper that returns just the text content
import { chat } from './index';
import type { AIProvider, ChatMessage } from './types';

export async function generateAIResponse(
  provider: AIProvider,
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
  _options?: { maxTokens?: number }
): Promise<string> {
  const r = await chat(provider, apiKey, messages, systemPrompt);
  return r.text;
}
