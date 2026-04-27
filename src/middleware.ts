import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const intlMiddleware = createIntlMiddleware(routing);

const APP_PATH_PREFIXES = [
  '/dashboard',
  '/transactions',
  '/debts',
  '/investments',
  '/goals',
  '/ai',
  '/settings',
  '/accounts',
  '/more',
];

const AUTH_PATH_PREFIXES = ['/login', '/signup'];

function stripLocale(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return '/';
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

export async function middleware(request: NextRequest) {
  // 1) Run intl middleware first to handle locale prefix routing
  const response = intlMiddleware(request);

  // 2) Determine current path (without locale prefix) for auth gate
  const pathnameWithoutLocale = stripLocale(request.nextUrl.pathname);
  const isAppRoute = APP_PATH_PREFIXES.some((p) => pathnameWithoutLocale.startsWith(p));
  const isAuthRoute = AUTH_PATH_PREFIXES.some((p) => pathnameWithoutLocale.startsWith(p));

  // 3) If route is protected or auth route, check Supabase session
  //    (skipped if Supabase env vars not set yet — for first local preview)
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project');

  if ((isAppRoute || isAuthRoute) && supabaseConfigured) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Redirect logged-out users hitting protected routes → /login
    if (!user && isAppRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // Redirect logged-in users hitting auth pages → /dashboard
    if (user && isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // Match every path EXCEPT: API routes, Next internals, Vercel internals, anything with a file extension.
  // This must include `/` so next-intl can rewrite it to the default locale.
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
};
