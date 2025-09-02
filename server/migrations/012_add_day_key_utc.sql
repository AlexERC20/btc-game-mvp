ALTER TABLE daily_caps ADD COLUMN IF NOT EXISTS day_key_utc BIGINT;
CREATE INDEX IF NOT EXISTS idx_daily_caps_day ON daily_caps(day_key_utc);

ALTER TABLE daily_friend_activity ADD COLUMN IF NOT EXISTS day_key_utc BIGINT;
CREATE INDEX IF NOT EXISTS idx_dfa_ref_day ON daily_friend_activity(referrer_user_id, day_key_utc);
