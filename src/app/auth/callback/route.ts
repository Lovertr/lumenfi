import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Mark as dynamic — uses request URL + cookies
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

function safeOrigin(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && /^https?:\/\//.test(envUrl)) {
    return envUrl.replace(/\/$/, '');
  }
  try {
    return new URL(request.url).origin;
  } catch {
    return 'https://lumenfi.vercel.app';
  }
}

export async function GET(request: NextRequest) {
  const origin = safeOrigin(request);
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const errorParam = url.searchParams.get('error');
    const errorDesc = url.searchParams.get('error_description');
    const next = url.searchParams.get('next') ?? '/dashboard';

    if (errorParam) {
      console.error('[auth/callback] OAuth error:', errorParam, errorDesc);
      const reason = encodeURIComponent((errorDesc ?? errorParam).slice(0, 200));
      return NextResponse.redirect(`${origin}/login?error=oauth_failed&reason=${reason}`);
    }

    if (!code) {
      return NextResponse.redirect(`${origin}/login?error=missing_code`);
    }

    const response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set({
                name,
                value,
                ...(options ?? {}),
                path: '/',
              });
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
      const reason = encodeURIComponent(error.message.slice(0, 200));
      return NextResponse.redirect(`${origin}/login?error=exchange_failed&reason=${reason}`);
    }

    return response;
  } catch (e: any) {
    console.error('[auth/callback] FATAL:', e?.message ?? e);
    return NextResponse.redirect(`${origin}/login?error=callback_crash`);
  }
}
