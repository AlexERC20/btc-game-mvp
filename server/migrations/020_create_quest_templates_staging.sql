BEGIN;

-- Таблица-приёмник любых версий сидов (без CHECK/NOT NULL/ENUM)
CREATE TABLE IF NOT EXISTS quest_templates_staging (
  qkey         text,
  title        text,
  description  text,
  goal         integer,
  metric       text,
  scope        text,
  reward_usd   numeric,
  weight       integer,
  enabled      boolean,
  meta         jsonb
);

-- На всякий случай почистим старые остатки
TRUNCATE quest_templates_staging;

COMMIT;
