-- ─────────────────────────────────────────────────────────
-- Migration 37: Drop FK constraint on subscription_orders.plan_code
-- Credit packs (credits_10/50/100) are one-off purchases, not subscription plans.
-- Storing them in orders without a FK keeps the schema flexible.
-- ─────────────────────────────────────────────────────────

alter table subscription_orders
  drop constraint if exists subscription_orders_plan_code_fkey;
