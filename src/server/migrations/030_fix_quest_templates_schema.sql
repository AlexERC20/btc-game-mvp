-- 030_fix_quest_templates_schema.sql

-- 1) Добавляем недостающие поля и дефолты
ALTER TABLE quest_templates
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS reward_type TEXT,
  ADD COLUMN IF NOT EXISTS reward_value INTEGER,
  ADD COLUMN IF NOT EXISTS frequency TEXT,
  ADD COLUMN IF NOT EXISTS cooldown_hours INTEGER NOT NULL DEFAULT 0;

-- 2) Чистим экспериментальные поля, если вдруг были
ALTER TABLE quest_templates
  DROP COLUMN IF EXISTS state;

-- 3) Чеки (аккуратно: ставим NOT VALID, чтобы не падать на имеющихся данных)
ALTER TABLE quest_templates
  ADD CONSTRAINT IF NOT EXISTS quest_templates_reward_type_check
    CHECK (reward_type = ANY (ARRAY['USD','VOP','XP'])) NOT VALID,
  ADD CONSTRAINT IF NOT EXISTS quest_templates_metric_chk
    CHECK (metric = ANY (ARRAY['count','usd','vop'])) NOT VALID,
  ADD CONSTRAINT IF NOT EXISTS quest_templates_frequency_chk
    CHECK (frequency = ANY (ARRAY['once','daily','weekly'])) NOT VALID;

-- 4) Уникальность по коду — это наш основной бизнес-ключ
CREATE UNIQUE INDEX IF NOT EXISTS uq_quest_templates_code ON quest_templates (code);
