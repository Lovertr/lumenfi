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

const PROMPT = `Extract data from this receipt/bill/transfer slip image. Return ONLY a JSON object — no markdown, no prose, no comments.

Required fields (use null if unclear):
- merchant: string — store/vendor/sender/receiver name
- date: string — ISO YYYY-MM-DD (use today's date if unclear)
- total: number — amount in THB without commas (positive)
- type: "expense" or "income" — "income" for transfers received or refunds, "expense" for purchases/payments
- category: string — best guess from: Food, Transport, Shopping, Bills, Health, Entertainment, Education, Housing, Salary, Transfer, Other
- note: string — short description in Thai if receipt is Thai (1 line, ≤80 chars)
- account_number: string — only if a real account number is visible (digits/dashes only, no labels). Return null if not visible.

Output ONLY the JSON object starting with { and ending with }`;

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

  const parsed = robustJsonParse(raw);
  if (!parsed) {
    console.error('[vision] JSON parse failed. Raw response:', raw.slice(0, 1000));
    throw new Error('AI returned invalid JSON. Try again or switch provider.');
  }

  return {
    merchant: typeof parsed.merchant === 'string' ? parsed.merchant : null,
    date: typeof parsed.date === 'string' ? parsed.date : null,
    total: parseNumber(parsed.total),
    type: parsed.type === 'income' ? 'income' : 'expense',
    category: typeof parsed.category === 'string' ? parsed.category : null,
    note: typeof parsed.note === 'string' ? parsed.note : null,
    account_number:
      typeof parsed.account_number === 'string' && parsed.account_number.trim() !== ''
        ? parsed.account_number
        : null,
  };
}

/**
 * Robust JSON parsing — handles AI wrapping output in markdown fences,
 * prose before/after, or returning multiple JSON-like blocks.
 */
function robustJsonParse(raw: string): any {
  if (!raw) return null;

  // Strategy 1: try parsing directly
  try {
    return JSON.parse(raw);
  } catch {}

  // Strategy 2: strip markdown fences
  const noFences = raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(noFences);
  } catch {}

  // Strategy 3: extract first {...} block (handles prose before/after)
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }

  return null;
}

function parseNumber(v: any): number | null {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[,\s฿$]/g, '');
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : null;
  }
  return null;
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
      max_tokens: 2048,
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
  const body: any = {
    model: isOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
        ],
      },
    ],
  };
  // Force JSON output for OpenAI to avoid prose wrapping
  if (!isOpenRouter) {
    body.response_format = { type: 'json_object' };
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
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
      generationConfig: {
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini vision ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}
