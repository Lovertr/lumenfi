-- ============================================================================
-- Personal Finance App — Supabase Database Schema
-- ============================================================================
-- รัน SQL นี้ใน Supabase SQL Editor หลังสร้าง project
-- (Dashboard > SQL Editor > New query > paste > Run)
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  default_currency TEXT DEFAULT 'THB',
  timezone TEXT DEFAULT 'Asia/Bangkok',
  locale TEXT DEFAULT 'th-TH',
  monthly_income_target NUMERIC(15,2),
  monthly_expense_target NUMERIC(15,2),
  -- AI settings
  ai_provider TEXT, -- 'anthropic' | 'openai' | 'gemini' | 'ollama'
  ai_api_key_encrypted TEXT, -- AES-GCM encrypted
  ai_endpoint TEXT, -- for self-hosted
  ai_privacy_mode BOOLEAN DEFAULT TRUE,
  -- Misc
  onboarded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. ACCOUNTS (บัญชีต่างๆ)
-- ============================================================================
CREATE TYPE account_type AS ENUM ('cash', 'bank', 'credit_card', 'e_wallet', 'savings', 'other');

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type account_type NOT NULL,
  currency TEXT DEFAULT 'THB',
  initial_balance NUMERIC(15,2) DEFAULT 0,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT '🏦',
  include_in_net_worth BOOLEAN DEFAULT TRUE,
  -- Credit card specific
  credit_limit NUMERIC(15,2),
  statement_day INT, -- วันที่ของเดือน (1-31)
  due_day INT,
  -- Soft delete
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- ============================================================================
-- 3. CATEGORIES
-- ============================================================================
CREATE TYPE category_type AS ENUM ('income', 'expense', 'both');

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type category_type DEFAULT 'expense',
  icon TEXT DEFAULT '💰',
  color TEXT DEFAULT '#3B82F6',
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  monthly_budget NUMERIC(15,2),
  is_default BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_user_id ON categories(user_id);

-- ============================================================================
-- 4. TRANSACTIONS
-- ============================================================================
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'THB',
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id UUID REFERENCES accounts(id), -- for transfers
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  tags TEXT[] DEFAULT '{}',
  photo_url TEXT, -- Supabase Storage URL
  location TEXT,
  -- Linkage
  recurring_id UUID, -- FK to recurring_templates
  transfer_id UUID, -- groups 2 sides of a transfer
  debt_payment_id UUID, -- FK to debt_payments if this is a debt payment
  goal_contribution_id UUID, -- FK to goal_contributions
  -- Metadata
  is_recurring_instance BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(user_id, category_id);
CREATE INDEX idx_transactions_account ON transactions(user_id, account_id);

-- ============================================================================
-- 5. RECURRING TEMPLATES
-- ============================================================================
CREATE TYPE frequency_type AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');

CREATE TABLE recurring_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type transaction_type NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  note TEXT,
  frequency frequency_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  next_occurrence DATE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_user_id ON recurring_templates(user_id);
CREATE INDEX idx_recurring_next ON recurring_templates(next_occurrence) WHERE active = TRUE;

-- ============================================================================
-- 6. DEBTS
-- ============================================================================
CREATE TYPE debt_type AS ENUM (
  'credit_card', 'personal_loan', 'auto_loan', 'mortgage',
  'student_loan', 'informal', 'installment_zero', 'other'
);

CREATE TYPE interest_type AS ENUM ('reducing', 'flat');
CREATE TYPE debt_status AS ENUM ('active', 'paid_off', 'defaulted');

CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type debt_type NOT NULL,
  lender TEXT,
  original_principal NUMERIC(15,2) NOT NULL,
  current_balance NUMERIC(15,2) NOT NULL,
  interest_rate NUMERIC(6,3) NOT NULL, -- % per year
  interest_type interest_type DEFAULT 'reducing',
  monthly_payment NUMERIC(15,2),
  total_term INT, -- จำนวนงวดทั้งหมด
  remaining_term INT,
  start_date DATE NOT NULL,
  due_day INT, -- วันที่ของเดือน
  late_fee NUMERIC(15,2) DEFAULT 0,
  status debt_status DEFAULT 'active',
  note TEXT,
  color TEXT DEFAULT '#EF4444',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_debts_user_id ON debts(user_id);

-- ============================================================================
-- 7. DEBT PAYMENTS
-- ============================================================================
CREATE TABLE debt_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  principal_portion NUMERIC(15,2),
  interest_portion NUMERIC(15,2),
  fee_portion NUMERIC(15,2) DEFAULT 0,
  payment_date DATE NOT NULL,
  is_extra_payment BOOLEAN DEFAULT FALSE,
  transaction_id UUID REFERENCES transactions(id), -- linked transaction
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_debt_payments_debt ON debt_payments(debt_id);
CREATE INDEX idx_debt_payments_user ON debt_payments(user_id);

-- ============================================================================
-- 8. INVESTMENTS
-- ============================================================================
CREATE TYPE investment_type AS ENUM (
  'thai_stock', 'foreign_stock', 'mutual_fund', 'etf',
  'crypto', 'gold', 'reit', 'property', 'bond',
  'fixed_deposit', 'lottery_savings', 'other'
);

CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT,
  name TEXT NOT NULL,
  type investment_type NOT NULL,
  broker_account TEXT, -- "Bualuang", "Settrade", "Binance"
  quantity NUMERIC(20,8) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(15,4) NOT NULL DEFAULT 0,
  current_price NUMERIC(15,4),
  currency TEXT DEFAULT 'THB',
  last_price_update TIMESTAMPTZ,
  note TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_investments_user_id ON investments(user_id);

CREATE TYPE investment_tx_type AS ENUM ('buy', 'sell', 'dividend', 'split', 'transfer_in', 'transfer_out');

CREATE TABLE investment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  type investment_tx_type NOT NULL,
  quantity NUMERIC(20,8) NOT NULL,
  price NUMERIC(15,4) NOT NULL,
  fee NUMERIC(15,2) DEFAULT 0,
  tax NUMERIC(15,2) DEFAULT 0,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inv_tx_investment ON investment_transactions(investment_id);
CREATE INDEX idx_inv_tx_user ON investment_transactions(user_id);

-- ============================================================================
-- 9. GOALS
-- ============================================================================
CREATE TYPE goal_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE goal_status AS ENUM ('active', 'achieved', 'paused', 'cancelled');

CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC(15,2) NOT NULL,
  current_amount NUMERIC(15,2) DEFAULT 0,
  deadline DATE,
  priority goal_priority DEFAULT 'medium',
  status goal_status DEFAULT 'active',
  linked_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#10B981',
  is_emergency_fund BOOLEAN DEFAULT FALSE,
  auto_contribute_amount NUMERIC(15,2),
  auto_contribute_frequency frequency_type,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_user_id ON goals(user_id);

CREATE TABLE goal_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_id UUID REFERENCES transactions(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goal_contrib_goal ON goal_contributions(goal_id);

-- ============================================================================
-- 10. AI CONVERSATIONS
-- ============================================================================
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_conv_user ON ai_conversations(user_id);
CREATE INDEX idx_ai_msg_conv ON ai_messages(conversation_id);

-- ============================================================================
-- 11. NOTIFICATIONS
-- ============================================================================
CREATE TYPE notification_type AS ENUM (
  'bill_due', 'budget_exceeded', 'goal_milestone',
  'recurring_created', 'ai_digest', 'system'
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_user_unread ON notifications(user_id, read, created_at DESC);

-- ============================================================================
-- 12. NET WORTH SNAPSHOTS (for historical chart)
-- ============================================================================
CREATE TABLE net_worth_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_assets NUMERIC(15,2) NOT NULL,
  total_liabilities NUMERIC(15,2) NOT NULL,
  net_worth NUMERIC(15,2) NOT NULL,
  breakdown JSONB, -- {accounts: {...}, investments: {...}, debts: {...}}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_nw_user_date ON net_worth_snapshots(user_id, date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;

-- Generic policy: user can only see their own data
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profiles', 'accounts', 'categories', 'transactions',
    'recurring_templates', 'debts', 'debt_payments',
    'investments', 'investment_transactions',
    'goals', 'goal_contributions',
    'ai_conversations', 'ai_messages',
    'notifications', 'net_worth_snapshots'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "Users can view own %1$s" ON %1$s FOR SELECT USING (auth.uid() = %2$s)',
      t,
      CASE WHEN t = 'profiles' THEN 'id' ELSE 'user_id' END
    );
    EXECUTE format('CREATE POLICY "Users can insert own %1$s" ON %1$s FOR INSERT WITH CHECK (auth.uid() = %2$s)',
      t,
      CASE WHEN t = 'profiles' THEN 'id' ELSE 'user_id' END
    );
    EXECUTE format('CREATE POLICY "Users can update own %1$s" ON %1$s FOR UPDATE USING (auth.uid() = %2$s)',
      t,
      CASE WHEN t = 'profiles' THEN 'id' ELSE 'user_id' END
    );
    EXECUTE format('CREATE POLICY "Users can delete own %1$s" ON %1$s FOR DELETE USING (auth.uid() = %2$s)',
      t,
      CASE WHEN t = 'profiles' THEN 'id' ELSE 'user_id' END
    );
  END LOOP;
END $$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at auto-update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profiles', 'accounts', 'transactions', 'recurring_templates',
    'debts', 'investments', 'goals', 'ai_conversations'
  ])
  LOOP
    EXECUTE format('CREATE TRIGGER update_%1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
  END LOOP;
END $$;

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
-- Run in Supabase Dashboard > Storage:
-- 1. Create bucket "receipts" (private)
-- 2. Add RLS policy: users can upload/read their own files (path starts with their user_id)

-- ============================================================================
-- DEFAULT CATEGORIES SEED (run after first signup, or manually for testing)
-- ============================================================================
-- This is a function ที่จะเรียกหลังสร้าง user ใหม่ (call from app code)
CREATE OR REPLACE FUNCTION seed_default_categories(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES
    -- Expense categories
    (p_user_id, 'อาหาร', 'expense', '🍔', '#F59E0B', TRUE),
    (p_user_id, 'เดินทาง', 'expense', '🚗', '#3B82F6', TRUE),
    (p_user_id, 'ค่าที่อยู่อาศัย', 'expense', '🏠', '#8B5CF6', TRUE),
    (p_user_id, 'ค่าน้ำค่าไฟ', 'expense', '💡', '#EAB308', TRUE),
    (p_user_id, 'ของใช้', 'expense', '🛒', '#06B6D4', TRUE),
    (p_user_id, 'เสื้อผ้า', 'expense', '👕', '#EC4899', TRUE),
    (p_user_id, 'สุขภาพ', 'expense', '🏥', '#EF4444', TRUE),
    (p_user_id, 'การศึกษา', 'expense', '📚', '#14B8A6', TRUE),
    (p_user_id, 'บันเทิง', 'expense', '🎬', '#A855F7', TRUE),
    (p_user_id, 'ของขวัญ/บริจาค', 'expense', '🎁', '#F43F5E', TRUE),
    (p_user_id, 'อื่นๆ', 'expense', '📦', '#6B7280', TRUE),
    -- Income categories
    (p_user_id, 'เงินเดือน', 'income', '💰', '#10B981', TRUE),
    (p_user_id, 'รายได้เสริม', 'income', '💵', '#22C55E', TRUE),
    (p_user_id, 'เงินปันผล', 'income', '📈', '#84CC16', TRUE),
    (p_user_id, 'ดอกเบี้ย', 'income', '💎', '#0EA5E9', TRUE),
    (p_user_id, 'รายได้อื่น', 'income', '✨', '#6B7280', TRUE);
END;
$$ LANGUAGE plpgsql;
