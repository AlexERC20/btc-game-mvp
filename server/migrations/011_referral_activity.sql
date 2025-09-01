CREATE TABLE IF NOT EXISTS referral_activity (
  referrer_id BIGINT NOT NULL,
  friend_id   BIGINT NOT NULL,
  last_active_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (referrer_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_activity_referrer
  ON referral_activity (referrer_id);

CREATE INDEX IF NOT EXISTS idx_referral_activity_friend
  ON referral_activity (friend_id);
