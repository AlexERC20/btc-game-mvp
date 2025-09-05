-- Create staging table for canonical quest templates
CREATE TABLE IF NOT EXISTS quest_templates_staging (
  code        TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  descr       TEXT NOT NULL,
  scope       TEXT NOT NULL,
  metric      TEXT NOT NULL,
  goal        INTEGER NOT NULL,
  reward_usd  INTEGER NOT NULL,
  reward_vop  INTEGER NOT NULL,
  qkey        TEXT NOT NULL
);
