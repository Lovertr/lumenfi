-- Type-specific debt fields for accurate interest modeling
ALTER TABLE debts
  ADD COLUMN IF NOT EXISTS rate_type TEXT
    CHECK (rate_type IN ('reducing', 'flat', 'stepped', 'promo_then_apr', 'daily_revolving')),
  ADD COLUMN IF NOT EXISTS rate_schedule JSONB,
  -- example: [{"from_month":1,"to_month":12,"rate":2.99},{"from_month":13,"to_month":24,"rate":3.49},{"from_month":25,"to_month":36,"rate":4.49},{"from_month":37,"to_month":null,"rate":7.0}]
  ADD COLUMN IF NOT EXISTS lock_in_months SMALLINT,
  ADD COLUMN IF NOT EXISTS promo_end_date DATE,
  ADD COLUMN IF NOT EXISTS post_promo_rate NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS statement_day SMALLINT CHECK (statement_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS due_day SMALLINT CHECK (due_day BETWEEN 1 AND 31);

COMMENT ON COLUMN debts.rate_type IS
  'reducing = ลดต้นลดดอก (amortizing) | flat = ลดต้นไม่ลดดอก (flat-rate, common for Thai auto loans) | stepped = ดอกแตกต่างตามช่วง (Thai mortgage Y1/Y2/Y3) | promo_then_apr = 0% promo then high APR | daily_revolving = คิดดอกรายวัน (credit cards)';

COMMENT ON COLUMN debts.rate_schedule IS
  'For stepped rates: array of {from_month, to_month (null=ongoing), rate}';
