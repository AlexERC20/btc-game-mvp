-- 020_create_quest_templates_staging.sql
CREATE TABLE IF NOT EXISTS quest_templates_staging (
  code            TEXT PRIMARY KEY,
  scope           TEXT NOT NULL,
  metric          TEXT NOT NULL,
  goal            INTEGER NOT NULL,
  title           TEXT,
  descr           TEXT,
  reward_usd      INTEGER NOT NULL DEFAULT 0,
  cooldown_hours  INTEGER NOT NULL DEFAULT 0
);
