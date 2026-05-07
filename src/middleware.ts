import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

// Minimal middleware — just next-intl handling locale routing.
// Auth checks have been moved to server components / server actions
// via supabase.auth.getUser() to keep the middleware path simple.
export default createMiddleware(routing);

export const config = {
  // Exclude api/, auth/ (oauth callback), _next, _vercel, and static files
  matcher: ['/', '/(en|th)/:path*', '/((?!api|auth|_next|_vercel|.*\\..*).*)'],
};
