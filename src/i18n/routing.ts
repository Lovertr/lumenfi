import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['th', 'en'],
  defaultLocale: 'th',
  // 'always' = / redirects to /th, all URLs have explicit locale prefix.
  // More robust on Vercel edge than 'as-needed'.
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
