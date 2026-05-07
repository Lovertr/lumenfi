import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const errorParam = url.searchParams.get('error');
    const errorDesc = url.searchParams.get('error_description');
    const next = url.searchParams.get('next') ?? '/dashboard';

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;

    // Supabase forwarded an OAuth error from Google (e.g. user denied,
    // exchange failed, etc.) — log + redirect to /login with reason
    if (errorParam) {
      console.error('[auth/callback] OAuth error:', errorParam, errorDesc);
      const reason = encodeURIComponent(errorDesc?.slice(0, 200) ?? errorParam);
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
      return NextResponse.redirect(`${origin}/login?error=exchange_failed&reason=${encodeURIComponent(error.message.slice(0, 200))}`);
    }

    return response;
  } catch (e: any) {
    console.error('[auth/callback] FATAL:', e?.message ?? e);
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/login?error=callback_crash`);
  }
}
