CREATE TABLE IF NOT EXISTS daily_caps (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_utc DATE NOT NULL,
  cap_usd_base INT NOT NULL,
  cap_usd_bonus INT NOT NULL DEFAULT 0,
  used_usd INT NOT NULL DEFAULT 0,
  UNIQUE (user_id, day_utc)
);

CREATE INDEX IF NOT EXISTS idx_daily_caps_user_day
  ON daily_caps (user_id, day_utc);
