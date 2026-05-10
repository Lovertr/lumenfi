-- ─────────────────────────────────────────────────────────
-- 22. Credit card installments — link debts to source account
-- ─────────────────────────────────────────────────────────
-- When a credit card purchase is converted to installments, create a
-- debt record and link it back to the credit card account so we know
-- which card is paying it off.
--
-- This avoids double-counting in net worth: if a debt has a
-- linked_account_id, it means the debt is "tracked through" that
-- account, so we don't sum it separately.

alter table debts
  add column if not exists linked_account_id uuid references accounts(id) on delete set null,
  add column if not exists installment_origin_tx_id uuid references transactions(id) on delete set null;

create index if not exists idx_debts_linked_account
  on debts(linked_account_id) where linked_account_id is not null;

create index if not exists idx_debts_origin_tx
  on debts(installment_origin_tx_id) where installment_origin_tx_id is not null;
