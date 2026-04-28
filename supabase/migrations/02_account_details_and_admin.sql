-- ============================================================================
-- Migration 02: Account details + Admin flag
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add account detail fields (bank info, account number, etc.)
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS account_holder TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT;

-- Add admin flag to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Set Lovertr (tintanee.t@gmail.com) as admin
UPDATE profiles
SET is_admin = TRUE
WHERE email = 'tintanee.t@gmail.com';

-- Optional: also set in auth.users metadata for extra safety
-- (this ensures admin status survives even if profile row is deleted)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{is_admin}',
  'true'::jsonb
)
WHERE email = 'tintanee.t@gmail.com';

-- Verify the update
SELECT id, email, full_name, is_admin
FROM profiles
WHERE email = 'tintanee.t@gmail.com';
