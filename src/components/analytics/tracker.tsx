'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Client-side event tracker.
 * - Auto-tracks page_view on every route change
 * - Exposes window.lumTrack(event, props) for manual events
 * - Session ID stored in localStorage (persists across visits)
 */

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let sid = localStorage.getItem('lum_sid');
    if (!sid) {
      sid = 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('lum_sid', sid);
    }
    return sid;
  } catch {
    return '';
  }
}

function readUTM() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
    const val = params.get(key);
    if (val) utm[key] = val.slice(0, 200);
  }
  // Persist UTMs from first landing
  try {
    if (utm.utm_source) {
      localStorage.setItem('lum_utm', JSON.stringify(utm));
    } else {
      const saved = localStorage.getItem('lum_utm');
      if (saved) return { ...JSON.parse(saved), ...utm };
    }
  } catch {
    /* ignore */
  }
  return utm;
}

export async function trackEvent(event: string, properties: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        session_id: getOrCreateSessionId(),
        path: window.location.pathname,
        properties,
        ...readUTM(),
      }),
      keepalive: true,
    });
  } catch {
    /* silent — don't break user flow */
  }
}

// Expose globally so any component can call window.lumTrack('event_name', {...})
if (typeof window !== 'undefined') {
  (window as unknown as { lumTrack?: typeof trackEvent }).lumTrack = trackEvent;
}

export function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Don't track admin routes
    if (pathname?.includes('/settings/admin')) return;
    // Fire page_view on every route change
    trackEvent('page_view', { search: searchParams?.toString() ?? '' });
  }, [pathname, searchParams]);

  return null;
}
