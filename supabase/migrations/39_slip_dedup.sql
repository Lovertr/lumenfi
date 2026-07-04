-- ─────────────────────────────────────────────────────────
-- 39. Slip dedup — prevent same bank transaction reference
--     from being used to activate multiple orders
-- ─────────────────────────────────────────────────────────

-- Slip2Go returns transRef (the bank's unique transaction reference).
-- We store it inside slip_verify_meta JSON. Add a computed column
-- + partial unique index so the same slip can't be reused.

-- Only enforce uniqueness for approved orders (rejected/refunded can be recycled)
create unique index if not exists idx_subscription_orders_slip_trans_ref_unique
  on subscription_orders ((slip_verify_meta->>'transRef'))
  where slip_verify_meta->>'transRef' is not null
    and status = 'approved';

-- Add a fast lookup index for the API to check "is this slip already used?"
-- BEFORE inserting/approving. Non-unique because pending_review may exist
-- simultaneously (race window is tiny but possible).
create index if not exists idx_subscription_orders_slip_trans_ref
  on subscription_orders ((slip_verify_meta->>'transRef'))
  where slip_verify_meta->>'transRef' is not null;
