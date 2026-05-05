-- Daily expense reminder settings on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_hour SMALLINT NOT NULL DEFAULT 21
    CHECK (reminder_hour BETWEEN 0 AND 23),
  ADD COLUMN IF NOT EXISTS reminder_skip_if_logged BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS reminder_last_sent_on DATE;

COMMENT ON COLUMN profiles.reminder_hour IS 'Hour of day (0-23) in Asia/Bangkok TZ to send reminder';
COMMENT ON COLUMN profiles.reminder_skip_if_logged IS 'If true, skip reminder when user already logged a transaction today';
