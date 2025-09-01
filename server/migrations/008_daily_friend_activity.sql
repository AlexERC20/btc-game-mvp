CREATE TABLE IF NOT EXISTS daily_friend_activity (
  id BIGSERIAL PRIMARY KEY,
  friend_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referrer_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  first_event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (friend_user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_dfa_ref_day
  ON daily_friend_activity (referrer_user_id, activity_date);

CREATE INDEX IF NOT EXISTS idx_dfa_friend_day
  ON daily_friend_activity (friend_user_id, activity_date);
