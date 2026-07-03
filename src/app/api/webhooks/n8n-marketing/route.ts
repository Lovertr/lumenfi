import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createClient as createSbClient } from '@supabase/supabase-js';

// Node runtime for crypto + service-role client
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook receiver for the n8n auto-post pipeline (Horakom clone).
 *
 * n8n workflows POST here at 4 key moments:
 *   1. status=published       — after WF5/Reel successfully posts to FB
 *   2. status=failed          — after any workflow errors out
 *   3. status=publishing      — optional in-flight signal
 *   4. status=comment_replied — WF6 after replying to a comment (analytics)
 *
 * Expected JSON body:
 * {
 *   secret: "<shared secret>",     // HMAC-lite: exact match with N8N_WEBHOOK_SECRET
 *   status: "published" | "failed" | "publishing" | "comment_replied",
 *   platform: "facebook_page" | "facebook_reels",
 *   message: string,               // full caption
 *   media_type: "text" | "image" | "carousel" | "video" | "reel",
 *   media_urls?: string[],
 *   video_title?: string,
 *   external_post_id?: string,     // FB post/reel id after publish
 *   scheduled_at?: string,         // ISO — when n8n intended to publish
 *   published_at?: string,         // ISO — actual publish time
 *   content_pillar?: string,       // "education" | "use_case" | ...
 *   hashtags?: string[],
 *   ai_generated?: boolean,
 *   ai_prompt?: string,
 *   error?: string,                // populated when status=failed
 *   n8n_execution_id?: string      // for cross-referencing in n8n Executions view
 * }
 *
 * We identify duplicates via external_post_id + platform. n8n's retry logic
 * may re-send the same event — this endpoint is idempotent.
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

interface WebhookBody {
  secret?: string;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled' | 'comment_replied';
  platform?: string;
  message?: string;
  media_type?: string;
  media_urls?: string[];
  video_title?: string;
  external_post_id?: string;
  scheduled_at?: string;
  published_at?: string;
  content_pillar?: string;
  hashtags?: string[];
  ai_generated?: boolean;
  ai_prompt?: string;
  error?: string;
  n8n_execution_id?: string;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[n8n-marketing] N8N_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  }

  let body: WebhookBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // Accept secret via body.secret OR common header names so n8n Header Auth
  // credentials (Lumenfi Webhook Secret / Bearer / custom) all work.
  const authHeader = req.headers.get('authorization') ?? '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const provided =
    body.secret ??
    req.headers.get('x-lumenfi-secret') ??
    req.headers.get('x-n8n-secret') ??
    req.headers.get('x-webhook-secret') ??
    bearerToken ??
    '';
  if (!safeEqual(String(provided), secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!body.status) {
    return NextResponse.json({ error: 'missing_status' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createSbClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Resolve owner — admin user by email. Marketing posts belong to the admin
  // account for now; multi-user posting can extend this later.
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .maybeSingle();
  if (!adminProfile?.id) {
    console.error('[n8n-marketing] admin profile not found:', ADMIN_EMAIL);
    return NextResponse.json({ error: 'admin_not_found' }, { status: 500 });
  }
  const userId = adminProfile.id as string;

  // Try idempotent upsert — match by external_post_id when present
  if (body.external_post_id) {
    const { data: existing } = await supabase
      .from('marketing_posts')
      .select('id, status')
      .eq('user_id', userId)
      .eq('external_post_id', body.external_post_id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('marketing_posts')
        .update({
          status: body.status === 'comment_replied' ? existing.status : body.status,
          message: body.message ?? undefined,
          media_type: body.media_type ?? undefined,
          media_urls: body.media_urls ?? undefined,
          content_pillar: body.content_pillar ?? undefined,
          hashtags: body.hashtags ?? undefined,
          ai_generated: body.ai_generated ?? undefined,
          ai_prompt: body.ai_prompt ?? undefined,
          error: body.error ?? undefined,
          published_at: body.published_at ?? undefined,
        })
        .eq('id', existing.id);
      if (error) {
        console.error('[n8n-marketing] update failed:', error);
        return NextResponse.json({ error: 'db' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, action: 'updated', id: existing.id });
    }
  }

  // New row
  const { data: inserted, error: insertErr } = await supabase
    .from('marketing_posts')
    .insert({
      user_id: userId,
      platform: body.platform ?? 'facebook_page',
      message: body.message ?? '(no message)',
      media_type: body.media_type ?? 'text',
      media_urls: body.media_urls ?? [],
      video_title: body.video_title ?? null,
      scheduled_at: body.scheduled_at ?? new Date().toISOString(),
      status: body.status === 'comment_replied' ? 'published' : body.status,
      external_post_id: body.external_post_id ?? null,
      published_at: body.published_at ?? null,
      content_pillar: body.content_pillar ?? null