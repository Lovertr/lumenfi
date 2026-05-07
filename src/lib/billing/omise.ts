// ─────────────────────────────────────────────────────────
// Omise integration — checkout, subscription, webhook
// Uses Omise.js Hosted Checkout for simplicity (no PCI compliance needed)
// ─────────────────────────────────────────────────────────

const OMISE_API_BASE = 'https://api.omise.co';
const OMISE_VAULT_BASE = 'https://vault.omise.co';

function getSecretKey(): string {
  return process.env.OMISE_SECRET_KEY ?? '';
}

function isConfigured(): boolean {
  return !!process.env.OMISE_SECRET_KEY && !!process.env.OMISE_PUBLIC_KEY;
}

export { isConfigured as isOmiseConfigured };

interface OmiseChargeOpts {
  amount: number;       // in satang (smallest unit) — ฿100 = 10000
  currency?: string;    // default 'THB'
  description: string;
  metadata?: Record<string, any>;
  return_uri?: string;  // redirect after 3DS
  card?: string;        // token from Omise.js (frontend tokenization)
  customer?: string;    // omise_cust_xxx (for stored cards)
}

export async function createCharge(opts: OmiseChargeOpts) {
  if (!isConfigured()) throw new Error('omise_not_configured');

  const body = new URLSearchParams();
  body.set('amount', String(opts.amount));
  body.set('currency', opts.currency ?? 'thb');
  body.set('description', opts.description);
  if (opts.return_uri) body.set('return_uri', opts.return_uri);
  if (opts.card) body.set('card', opts.card);
  if (opts.customer) body.set('customer', opts.customer);
  if (opts.metadata) {
    for (const [k, v] of Object.entries(opts.metadata)) {
      body.set(`metadata[${k}]`, String(v));
    }
  }

  const res = await fetch(`${OMISE_API_BASE}/charges`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(getSecretKey() + ':').toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`omise_charge_failed: ${err.slice(0, 200)}`);
  }

  return await res.json();
}

interface OmiseCustomerOpts {
  email: string;
  description?: string;
  metadata?: Record<string, any>;
}

export async function createCustomer(opts: OmiseCustomerOpts) {
  if (!isConfigured()) throw new Error('omise_not_configured');

  const body = new URLSearchParams();
  body.set('email', opts.email);
  if (opts.description) body.set('description', opts.description);
  if (opts.metadata) {
    for (const [k, v] of Object.entries(opts.metadata)) {
      body.set(`metadata[${k}]`, String(v));
    }
  }

  const res = await fetch(`${OMISE_API_BASE}/customers`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(getSecretKey() + ':').toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`omise_customer_failed: ${err.slice(0, 200)}`);
  }

  return await res.json();
}

/**
 * Create a "scheduled" recurring charge (subscription-like)
 * Omise has a Schedules API for this — we attach a card/customer
 * and let Omise create charges on a fixed cadence.
 */
interface OmiseScheduleOpts {
  every: number;
  period: 'day' | 'week' | 'month';
  on?: { weekdays?: string[]; days_of_month?: number[] };
  end_date?: string;
  description: string;
  charge: {
    customer: string;  // omise_cust_xxx
    amount: number;    // satang
    description: string;
  };
}

export async function createSchedule(opts: OmiseScheduleOpts) {
  if (!isConfigured()) throw new Error('omise_not_configured');

  const body = new URLSearchParams();
  body.set('every', String(opts.every));
  body.set('period', opts.period);
  if (opts.end_date) body.set('end_date', opts.end_date);
  body.set('description', opts.description);
  body.set('charge[customer]', opts.charge.customer);
  body.set('charge[amount]', String(opts.charge.amount));
  body.set('charge[description]', opts.charge.description);
  if (opts.on?.days_of_month) {
    for (const d of opts.on.days_of_month) {
      body.append('on[days_of_month][]', String(d));
    }
  }

  const res = await fetch(`${OMISE_API_BASE}/schedules`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(getSecretKey() + ':').toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`omise_schedule_failed: ${err.slice(0, 200)}`);
  }

  return await res.json();
}

export async function deleteSchedule(scheduleId: string) {
  if (!isConfigured()) throw new Error('omise_not_configured');

  const res = await fetch(`${OMISE_API_BASE}/schedules/${scheduleId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Basic ${Buffer.from(getSecretKey() + ':').toString('base64')}`,
    },
  });

  return res.ok;
}
