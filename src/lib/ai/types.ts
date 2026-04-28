export type Role = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface ChatResponse {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'openrouter';
