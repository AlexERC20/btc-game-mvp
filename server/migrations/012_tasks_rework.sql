DROP TABLE IF EXISTS user_task_progress;
DROP TABLE IF EXISTS tasks;

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('daily','weekly')),
  goal INT NOT NULL,
  reward_usd INT NOT NULL DEFAULT 0,
  reward_vop INT NOT NULL DEFAULT 0,
  reward_limit_delta INT NOT NULL DEFAULT 0,
  min_level INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS user_task_progress (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  task_code TEXT NOT NULL REFERENCES tasks(code),
  period TEXT NOT NULL,
  period_key TEXT NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  goal INT NOT NULL,
  reward_usd INT NOT NULL,
  reward_vop INT NOT NULL,
  reward_limit_delta INT NOT NULL,
  claimed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_code, period_key)
);

CREATE INDEX IF NOT EXISTS utp_user_period_idx
  ON user_task_progress (user_id, period, period_key);
