-- ─────────────────────────────────────────────────────────
-- Migration 38: Allow 'refunded' status on subscription_orders
-- Admin can mark approved orders as refunded (reversing activation)
-- ─────────────────────────────────────────────────────────

alter table subscription_orders
  drop constraint if exists subscription_orders_status_check;

alter table subscription_orders
  add constraint subscription_orders_status_check
  check (status in (
    'pending_upload', 'pending_review', 'approved', 'rejected',
    'expired', 'cancelled', 'refunded'
  ));
