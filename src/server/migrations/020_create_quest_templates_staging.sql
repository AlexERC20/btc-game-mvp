-- 020_create_quest_templates_staging.sql
CREATE TABLE IF NOT EXISTS quest_templates_staging (
  code            TEXT NOT NULL,
  scope           TEXT NOT NULL,
  metric          TEXT NOT NULL,
  goal            INTEGER NOT NULL,
  title           TEXT NOT NULL,
  descr           TEXT NOT NULL,
  reward_usd      INTEGER NOT NULL,
  cooldown_hours  INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS quest_templates_staging_code_idx
  ON quest_templates_staging(code);
