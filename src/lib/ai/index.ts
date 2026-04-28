import type { ChatMessage, ChatResponse, AIProvider } from './types';
import { anthropicChat } from './providers/anthropic';
import { openaiChat, openrouterChat } from './providers/openai';
import { geminiChat } from './providers/gemini';

export async function chat(
  provider: AIProvider,
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string
): Promise<ChatResponse> {
  switch (provider) {
    case 'anthropic':
      return anthropicChat(apiKey, messages, systemPrompt);
    case 'openai':
      return openaiChat(apiKey, messages, systemPrompt);
    case 'openrouter':
      return openrouterChat(apiKey, messages, systemPrompt);
    case 'gemini':
      return geminiChat(apiKey, messages, systemPrompt);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export type { ChatMessage, ChatResponse, AIProvider };
