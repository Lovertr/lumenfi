-- ════════════════════════════════════════════════════════════════════
-- Migration 33 — debt_plans extensions for AI advice + saved details
-- ────────────────────────────────────────────────────────────────────
-- Why: the AI advice text used to disappear after the page reload.
-- Saved plans were a black box. Now we persist the full advice + the
-- AI's plan options so users can come back and review.
-- ════════════════════════════════════════════════════════════════════

alter table debt_plans
  add column if not exists ai_advice_md text,
  add column if not exists plan_options jsonb,
  add column if not exists selected_option_id text,
  add column if not exists snapshot jsonb;

-- Round legacy monthly_payment values on debts to 2 decimals — fixes the
-- '730.7210000' display issue going forward.
update debts
set monthly_payment = round(monthly_payment::numeric, 2)
where monthly_payment is not null
  and monthly_payment <> round(monthly_payment::numeric, 2);
