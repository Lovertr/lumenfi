import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSbClient } from '@supabase/supabase-js';

export const runtime = 'edge';  // fast tracker endpoint
export const dynamic = 'force-dynamic';

interface TrackBody {
  event: string;
  session_id?: string;
  path?: string;
  properties?: Record<string, unknown>;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
}

export async function POST(req: Request) {
  let body: TrackBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!body.event) {
    return NextResponse.json({ error: 'missing_event' }, { status: 400 });
  }

  // Resolve user (may be anonymous)
  let userId: string | null = null;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // ignore — anon tracking still works
  }

  // Headers (referer, UA, country)
  const referer = req.headers.get('referer') ?? null;
  const userAgent = req.headers.get('user-agent') ?? null;
  const country = req.headers.get('x-vercel-ip-country') ?? null;

  // Insert via service role
  const admin = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { error } = await admin.from('site_events').insert({
    event_name: body.event.slice(0, 80),
    user_id: userId,
    session_id: body.session_id?.slice(0, 100) ?? null,
    path: body.path?.slice(0, 500) ?? null,
    referrer: referer?.slice(0, 500) ?? null,
    utm_source: body.utm_source?.slice(0, 100) ?? null,
    utm_medium: body.utm_medium?.slice(0, 100) ?? null,
    utm_campaign: body.utm_campaign?.slice(0, 200) ?? null,
    utm_content: body.utm_content?.slice(0, 200) ?? null,
    properties: body.properties ?? {},
    user_agent: userAgent?.slice(0, 300) ?? null,
    ip_country: country?.slice(0, 3) ?? null,
  });

  if (error) {
    console.warn('[track] insert failed:', error);
    return NextResponse.json({ ok: false, error: 'db' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
