import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Weekly token health check — Mondays at 08:00 BKK (01:00 UTC).
 *
 * Verifies that critical API tokens are still valid:
 *   - FB_PAGE_ACCESS_TOKEN (Facebook Graph API)
 *   - HEYGEN_API_KEY (if configured)
 *
 * If any token is invalid, sends an alert email to ADMIN_EMAIL via Resend.
 *
 * FB Page tokens can expire (long-lived tokens are ~60 days). This gives
 * proactive warning before workflows start failing.
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

interface CheckResult {
  service: string;
  ok: boolean;
  detail: string;
}

async function checkFbToken(token: string): Promise<CheckResult> {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${token}`, {
      cache: 'no-store',
    });
    const body = await res.json();
    if (!res.ok || body.error) {
      return {
        service: 'Facebook Page Token',
        ok: false,
        detail: body.error?.message ?? `HTTP ${res.status}`,
      };
    }
    return {
      service: 'Facebook Page Token',
      ok: true,
      detail: `Page: ${body.name ?? '?'} (id: ${body.id ?? '?'})`,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { service: 'Facebook Page Token', ok: false, detail: `Network error: ${msg}` };
  }
}

async function checkHeyGenToken(apiKey: string): Promise<CheckResult> {
  try {
    const res = await fetch('https://api.heygen.com/v2/user/remaining_quota', {
      headers: { 'x-api-key': apiKey },
      cache: 'no-store',
    });
    if (!res.ok) {
      return { service: 'HeyGen API Key', ok: false, detail: `HTTP ${res.status}` };
    }
    const body = await res.json();
    const remaining = body?.data?.remaining_quota ?? '?';
    return {
      service: 'HeyGen API Key',
      ok: true,
      detail: `Remaining quota: ${remaining} credits`,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { service: 'HeyGen API Key', ok: false, detail: `Network error: ${msg}` };
  }
}

async function checkAnthropic(apiKey: string): Promise<CheckResult> {
  try {
    // Minimal validation call — just ping the API
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'hi' }],
      }),
      cache: 'no-store',
    });
    if (res.status === 401 || res.status === 403) {
      const body = await res.json();
      return {
        service: 'Anthropic API Key',
        ok: false,
        detail: body.error?.message ?? `HTTP ${res.status}`,
      };
    }
    return { service: 'Anthropic API Key', ok: true, detail: `Auth ok` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { service: 'Anthropic API Key', ok: false, detail: `Network error: ${msg}` };
  }
}

async function sendAlertEmail(subject: string, body: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return { sent: false, reason: 'no_resend_key' };
  const emailFrom = process.env.RESEND_FROM ?? 'noreply@lumenfi.projectostech.com';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [ADMIN_EMAIL],
      subject,
      text: body,
    }),
  });
  return { sent: res.ok, reason: res.ok ? undefined : `resend ${res.status}` };
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const checks: CheckResult[] = [];

  const fbToken = process.env.FB_PAGE_ACCESS_TOKEN;
  if (fbToken) {
    checks.push(await checkFbToken(fbToken));
  }

  const heygenKey = process.env.HEYGEN_API_KEY;
  if (heygenKey) {
    checks.push(await checkHeyGenToken(heygenKey));
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    checks.push(await checkAnthropic(anthropicKey));
  }

  const failures = checks.filter((c) => !c.ok);

  // Send alert if any failure
  if (failures.length > 0) {
    const subject = `🚨 Lumenfi Token Health Alert — ${failures.length} service(s) failing`;
    const lines = [
      `Weekly token health check found ${failures.length} problem(s):`,
      ``,
      ...failures.map((f) => `❌ ${f.service}: ${f.detail}`),
      ``,
      `Working services:`,
      ...checks.filter((c) => c.ok).map((c) => `✅ ${c.service}: ${c.detail}`),
      ``,
      `Action required — rotate keys in Vercel env vars.`,
    ];
    await sendAlertEmail(subject, lines.join('\n'));
  }

  return NextResponse.json({
    ok: failures.length === 0,
    checked: checks.length,
    failing: failures.length,
    checks,
  });
}
