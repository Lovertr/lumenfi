/**
 * AES-GCM encryption for sensitive data (e.g. user's AI API keys).
 * Uses Node.js Web Crypto API (works in Node + Edge runtime).
 */

const ALG = 'AES-GCM';

function getKeyMaterial(): Promise<CryptoKey> {
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error('APP_ENCRYPTION_KEY must be set (32-byte base64)');
  }
  // Pad / truncate to 32 bytes for AES-256
  const raw = new TextEncoder().encode(secret.padEnd(32, '0').slice(0, 32));
  return crypto.subtle.importKey('raw', raw, ALG, false, ['encrypt', 'decrypt']);
}

export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) return '';
  const key = await getKeyMaterial();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: ALG, iv }, key, data);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(ciphertext: string): Promise<string> {
  if (!ciphertext) return '';
  try {
    const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const key = await getKeyMaterial();
    const decrypted = await crypto.subtle.decrypt({ name: ALG, iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return '';
  }
}

/**
 * Show only first 4 + last 4 chars of a key, e.g. "sk-1...abcd"
 */
export function maskKey(key: string): string {
  if (!key || key.length < 12) return '••••••••';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
