CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  period TEXT NOT NULL CHECK (period IN ('DAILY','WEEKLY')),
  title TEXT NOT NULL,
  descr TEXT,
  event TEXT NOT NULL,
  target_count INT NOT NULL,
  visible_min_level INT NOT NULL DEFAULT 1,
  reward_json JSONB NOT NULL DEFAULT '[]',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS user_task_progress (
  user_id BIGINT NOT NULL REFERENCES users(id),
  task_id TEXT NOT NULL REFERENCES tasks(id),
  period_key TEXT NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  meta JSONB,
  PRIMARY KEY (user_id, task_id, period_key)
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS task_bonus_usd_today INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS task_bonus_date DATE;
