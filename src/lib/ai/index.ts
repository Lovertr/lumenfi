import type { ChatMessage, ChatResponse, AIProvider } from './types';
import { anthropicChat } from './providers/anthropic';
import { openaiChat, openrouterChat } from './providers/openai';
import { geminiChat } from './providers/gemini';

export async function chat(
  provider: AIProvider,
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string,
  options?: { maxTokens?: number }
): Promise<ChatResponse> {
  const maxTokens = options?.maxTokens;
  switch (provider) {
    case 'anthropic':
      return anthropicChat(apiKey, messages, systemPrompt, maxTokens);
    case 'openai':
      return openaiChat(apiKey, messages, systemPrompt, maxTokens);
    case 'openrouter':
      return openrouterChat(apiKey, messages, systemPrompt, maxTokens);
    case 'gemini':
      return geminiChat(apiKey, messages, systemPrompt, maxTokens);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export type { ChatMessage, ChatResponse, AIProvider };
