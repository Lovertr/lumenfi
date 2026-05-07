// ─────────────────────────────────────────────────────────
// App version queries — for /whats-new + dashboard badge
// ─────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';

export interface AppVersionHighlight {
  icon: string;
  text: string;
  url?: string;
}

export interface AppVersion {
  version: string;
  released_on: string;
  title: string;
  summary: string | null;
  highlights: AppVersionHighlight[];
  is_major: boolean;
}

export async function getVersions(limit = 20): Promise<AppVersion[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('app_versions')
    .select('version, released_on, title, summary, highlights, is_major')
    .order('released_on', { ascending: false })
    .limit(limit);
  return (data ?? []) as AppVersion[];
}

export async function getLatestVersion(): Promise<AppVersion | null> {
  const v = await getVersions(1);
  return v[0] ?? null;
}

/**
 * Returns the latest version IF user hasn't seen it yet (otherwise null).
 * Used to drive the "What's New" banner on dashboard.
 */
export async function getUnseenVersion(): Promise<AppVersion | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: latest }, { data: profile }] = await Promise.all([
    supabase
      .from('app_versions')
      .select('version, released_on, title, summary, highlights, is_major')
      .order('released_on', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('profiles').select('last_seen_version').eq('id', user.id).maybeSingle(),
  ]);

  if (!latest) return null;
  if (profile?.last_seen_version === (latest as AppVersion).version) return null;
  return latest as AppVersion;
}

export async function markVersionSeen(version: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('profiles').update({ last_seen_version: version }).eq('id', user.id);
}
