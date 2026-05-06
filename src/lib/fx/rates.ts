// Currency conversion using exchangerate.host (free, no API key needed)
// Falls back to hardcoded approximate rates if API fails

const FALLBACK_RATES_TO_THB: Record<string, number> = {
  THB: 1,
  USD: 36,
  EUR: 39,
  JPY: 0.24,
  CNY: 5,
  SGD: 27,
  GBP: 46,
  HKD: 4.6,
};

interface CachedRates {
  base: 'THB';
  rates: Record<string, number>;
  fetched_at: number;
}

let cache: CachedRates | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export async function getRatesToTHB(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cache && now - cache.fetched_at < CACHE_TTL_MS) {
    return cache.rates;
  }

  try {
    const res = await fetch(
      'https://api.exchangerate.host/latest?base=THB&symbols=USD,EUR,JPY,CNY,SGD,GBP,HKD',
      { next: { revalidate: 21600 } }
    );
    if (!res.ok) throw new Error(`fx ${res.status}`);
    const data = await res.json();
    const apiRates = data?.rates ?? {};

    const ratesToTHB: Record<string, number> = { THB: 1 };
    for (const [code, val] of Object.entries(apiRates)) {
      const v = Number(val);
      if (v > 0) ratesToTHB[code] = 1 / v;
    }
    cache = { base: 'THB', rates: ratesToTHB, fetched_at: now };
    return ratesToTHB;
  } catch (e) {
    console.warn('FX fetch failed, using fallback:', e);
    return FALLBACK_RATES_TO_THB;
  }
}

export async function convertToTHB(amount: number, fromCurrency: string): Promise<number> {
  if (fromCurrency === 'THB') return amount;
  const rates = await getRatesToTHB();
  const rate = rates[fromCurrency] ?? FALLBACK_RATES_TO_THB[fromCurrency];
  if (!rate) return amount;
  return amount * rate;
}

export function convertToTHBSync(
  amount: number,
  fromCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === 'THB') return amount;
  const rate = rates[fromCurrency] ?? FALLBACK_RATES_TO_THB[fromCurrency];
  return rate ? amount * rate : amount;
}
