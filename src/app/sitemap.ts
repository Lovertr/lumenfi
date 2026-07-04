import type { MetadataRoute } from 'next';

const BASE = 'https://lumenfi.projectostech.com';

// Public routes (excluded: /(app)/*, /(auth)/*, /api/*)
const PUBLIC_PATHS: Array<{ path: string; priority: number; changeFreq: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
  { path: '', priority: 1.0, changeFreq: 'weekly' },
  { path: '/pricing', priority: 0.9, changeFreq: 'weekly' },
  { path: '/features', priority: 0.8, changeFreq: 'weekly' },
  { path: '/agents/pricing', priority: 0.7, changeFreq: 'monthly' },
  { path: '/terms', priority: 0.3, changeFreq: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFreq: 'yearly' },
];

const LOCALES = ['th', 'en'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];
  for (const { path, priority, changeFreq } of PUBLIC_PATHS) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE}/${locale}${path}`,
        lastModified: now,
        changeFrequency: changeFreq,
        priority,
        alternates: {
          languages: {
            th: `${BASE}/th${path}`,
            en: `${BASE}/en${path}`,
          },
        },
      });
    }
  }
  return entries;
}
