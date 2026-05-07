// ─────────────────────────────────────────────────────────
// In-app notification logger — mirror every push for in-app history
// ─────────────────────────────────────────────────────────

import { createServiceClient } from '@/lib/supabase/admin';

export type NotificationType =
  | 'recurring'
  | 'budget'
  | 'watchlist'
  | 'secretary'
  | 'reminder'
  | 'system'
  | 'broadcast';

export type NotificationSeverity = 'info' | 'warn' | 'critical' | 'success';

export interface LogNotificationInput {
  userId: string;
  type: NotificationType;
  severity?: NotificationSeverity;
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
  sentAsPush?: boolean;
  pushDeliveryStatus?: 'sent' | 'failed' | 'no_subscription';
}

/**
 * Insert a notification into the in-app log.
 * Always insert — even if push fails.
 * Uses service client to bypass RLS (called from cron / server actions).
 */
export async function logNotification(input: LogNotificationInput): Promise<void> {
  try {
    const admin = createServiceClient();
    await admin.from('notifications').insert({
      user_id: input.userId,
      type: input.type,
      severity: input.severity ?? 'info',
      title: input.title,
      body: input.body,
      url: input.url ?? null,
      icon: input.icon ?? null,
      tag: input.tag ?? null,
      sent_as_push: input.sentAsPush ?? false,
      push_delivery_status: input.pushDeliveryStatus ?? null,
    });
  } catch (e) {
    console.warn('logNotification failed:', e);
  }
}
