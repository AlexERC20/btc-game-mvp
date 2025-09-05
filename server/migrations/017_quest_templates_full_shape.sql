BEGIN;

-- Базовые столбцы
ALTER TABLE quest_templates
  ADD COLUMN IF NOT EXISTS qkey        TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS title       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS scope       TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS goal        INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS metric      TEXT NOT NULL DEFAULT 'count',
  ADD COLUMN IF NOT EXISTS reward_usd  NUMERIC(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_vop  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frequency   TEXT NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS is_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ;

-- Ограничения-договённости
ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_scope_chk    CHECK (scope IN ('user','global'))    NOT VALID;
ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_metric_chk   CHECK (metric IN ('count','usd','vop')) NOT VALID;
ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_frequency_chk CHECK (frequency IN ('once','daily','weekly')) NOT VALID;

-- Уникальность по qkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE tablename='quest_templates' AND indexname='uq_quest_templates_qkey'
  ) THEN
    CREATE UNIQUE INDEX uq_quest_templates_qkey ON quest_templates (qkey);
  END IF;
END $$;

COMMIT;
