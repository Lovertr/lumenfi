import { createClient } from '@/lib/supabase/server';
import { NotificationBell } from './notification-bell';

export async function NotificationBellServer() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: notifications }, { count: unreadCount }] = await Promise.all([
    supabase
      .from('notifications')
      .select('id, type, severity, title, body, url, icon, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null),
  ]);

  return (
    <NotificationBell
      notifications={(notifications ?? []) as any}
      unreadCount={unreadCount ?? 0}
    />
  );
}
