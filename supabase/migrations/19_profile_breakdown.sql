-- ─────────────────────────────────────────────────────────
-- Migration 19: Granular profile data for AI fallback context
--
-- Lets users provide breakdown estimates so AI advisors can give
-- meaningful analysis even when transaction history is sparse.
-- ─────────────────────────────────────────────────────────

-- Income breakdown (monthly estimates in THB)
alter table profiles add column if not exists income_salary_monthly numeric;
alter table profiles add column if not exists income_side_monthly numeric;
alter table profiles add column if not exists income_investment_monthly numeric;
alter table profiles add column if not exists income_other_monthly numeric;

-- Expense breakdown (monthly estimates in THB)
alter table profiles add column if not exists expense_food_monthly numeric;
alter table profiles add column if not exists expense_utilities_monthly numeric;       -- ค่าน้ำ ค่าไฟ
alter table profiles add column if not exists expense_phone_internet_monthly numeric;
alter table profiles add column if not exists expense_transport_monthly numeric;       -- น้ำมัน BTS แท็กซี่
alter table profiles add column if not exists expense_housing_monthly numeric;         -- ค่าเช่า/ผ่อนบ้าน
alter table profiles add column if not exists expense_debt_payment_monthly numeric;    -- หนี้สินรวมต่อเดือน
alter table profiles add column if not exists expense_insurance_monthly numeric;       -- เบี้ยประกันรวม
alter table profiles add column if not exists expense_subscription_monthly numeric;    -- subscription/streaming
alter table profiles add column if not exists expense_other_monthly numeric;

-- Demographic + behavioral context for personalized advice
alter table profiles add column if not exists occupation text;
alter table profiles add column if not exists employment_type text check (
  employment_type is null
  or employment_type in ('employee', 'freelance', 'business_owner', 'student', 'retired', 'unemployed', 'other')
);
alter table profiles add column if not exists province text;                           -- จังหวัด (cost of living adjustment)
alter table profiles add column if not exists risk_tolerance text check (
  risk_tolerance is null
  or risk_tolerance in ('conservative', 'moderate', 'aggressive')
);
alter table profiles add column if not exists investment_experience text check (
  investment_experience is null
  or investment_experience in ('beginner', 'intermediate', 'expert')
);
alter table profiles add column if not exists financial_goal_summary text;             -- free-text เป้าหมายชีวิต

comment on column profiles.income_salary_monthly is 'Estimated net salary per month — fallback when transaction data is insufficient';
comment on column profiles.expense_food_monthly is 'Estimated food expense per month — fallback for AI analysis';
comment on column profiles.financial_goal_summary is 'Free-text description of life goals (e.g. retire at 55, buy condo by 2030)';
