import type { MetadataRoute } from 'next';

const BASE = 'https://lumenfi.projectostech.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/*/dashboard',
          '/*/accounts',
          '/*/debts',
          '/*/goals',
          '/*/investments',
          '/*/insurance',
          '/*/budget',
          '/*/recurring',
          '/*/tax',
          '/*/debt-plan',
          '/*/loan-sim',
          '/*/advisor',
          '/*/agents',
          '/*/settings',
          '/*/subscription',
          '/*/onboarding',
          '/*/reports',
          '/*/plans',
          '/*/categories',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
