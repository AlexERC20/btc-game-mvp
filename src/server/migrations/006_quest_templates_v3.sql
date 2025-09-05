-- remove legacy scope constraint so backfills won't fail
ALTER TABLE IF EXISTS quest_templates
  DROP CONSTRAINT IF EXISTS quest_templates_scope_chk,
  DROP CONSTRAINT IF EXISTS quest_templates_scope_check,
  DROP CONSTRAINT IF EXISTS quest_templates_frequency_chk,
  DROP CONSTRAINT IF EXISTS quest_templates_frequency_check;

-- create if missing
CREATE TABLE IF NOT EXISTS quest_templates (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('daily','weekly','oneoff')),
  reward_usd INTEGER NOT NULL DEFAULT 0,
  reward_vop INTEGER NOT NULL DEFAULT 0,
  limit_usd_delta INTEGER NOT NULL DEFAULT 0, -- +$ к дневному лимиту
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- апгрейд существующей таблицы под текущую модель (идемпотентно)
ALTER TABLE quest_templates
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS reward_vop INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS limit_usd_delta INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS type TEXT;

-- ensure critical columns are NOT NULL
ALTER TABLE quest_templates
  ALTER COLUMN code SET NOT NULL,
  ALTER COLUMN description SET NOT NULL,
  ALTER COLUMN type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='quest_templates_code_key'
  ) THEN
    ALTER TABLE quest_templates ADD CONSTRAINT quest_templates_code_key UNIQUE (code);
  END IF;
END $$;
