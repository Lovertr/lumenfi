import type { AIProvider } from './types';

interface ParsedReceipt {
  merchant?: string | null;
  date?: string | null; // YYYY-MM-DD
  total?: number | null;
  type?: 'income' | 'expense';
  category?: string | null;
  note?: string | null;
  account_number?: string | null;
}

const PROMPT = `You are an OCR + structuring assistant. Look at this receipt/bill/transfer slip image and extract:
- merchant: store/vendor name (string)
- date: ISO format YYYY-MM-DD (use today if unclear)
- total: total amount as a number (THB), no commas
- type: "expense" for purchases, "income" if it's a payment/transfer received
- category: best guess from these — Food, Transport, Shopping, Bills, Health, Entertainment, Education, Housing, Other
- note: short description like "Lunch at X" (Thai if receipt is Thai)
- account_number: if a payer/source bank account number, card last-4, or e-wallet phone is visible (the account paying or receiving), return ONLY digits/dashes (no labels). Otherwise null.

Respond ONLY with a single JSON object, no markdown fences, no commentary. Example:
{"merchant":"7-Eleven","date":"2026-04-28","total":135.50,"type":"expense","category":"Food","note":"ของกินที่ 7-11","account_number":"xxx-x-x1234-x"}`;

export async function visionParseReceipt(
  provider: AIProvider,
  apiKey: string,
  imageBase64: string,
  mimeType: string
): Promise<ParsedReceipt> {
  let raw = '';

  if (provider === 'anthropic') {
    raw = await anthropicVision(apiKey, imageBase64, mimeType);
  } else if (provider === 'openai' || provider === 'openrouter') {
    raw = await openaiVision(apiKey, imageBase64, mimeType, provider === 'openrouter');
  } else if (provider === 'gemini') {
    raw = await geminiVision(apiKey, imageBase64, mimeType);
  } else {
    throw new Error(`Vision not supported for ${provider}`);
  }

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      merchant: parsed.merchant ?? null,
      date: parsed.date ?? null,
      total: typeof parsed.total === 'number' ? parsed.total : parseFloat(String(parsed.total ?? '')) || null,
      type: parsed.type === 'income' ? 'income' : 'expense',
      category: parsed.category ?? null,
      note: parsed.note ?? null,
      account_number: typeof parsed.account_number === 'string' ? parsed.account_number : null,
    };
  } catch {
    return {};
  }
}

async function anthropicVision(apiKey: string, b64: string, mime: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic vision ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function openaiVision(apiKey: string, b64: string, mime: string, isOpenRouter = false): Promise<string> {
  const url = isOpenRouter
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: isOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI vision ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function geminiVision(apiKey: string, b64: string, mime: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: mime, data: b64 } },
            { text: PROMPT },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 1024 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini vision ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}
