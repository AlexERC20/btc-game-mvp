-- remove legacy scope constraint so backfills won't fail
ALTER TABLE IF EXISTS quest_templates
  DROP CONSTRAINT IF EXISTS quest_templates_scope_chk;

-- create if missing
CREATE TABLE IF NOT EXISTS quest_templates (
  id BIGSERIAL PRIMARY KEY,
  qkey TEXT UNIQUE NOT NULL,                 -- наш стабильный ключ
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
  ADD COLUMN IF NOT EXISTS qkey TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS reward_vop INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS limit_usd_delta INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS type TEXT;

-- на случай старой логики — оставляем code, но делаем backfill из qkey
ALTER TABLE quest_templates ADD COLUMN IF NOT EXISTS code TEXT;

-- backfill значений, чтобы не было NULL
UPDATE quest_templates
SET
  qkey        = COALESCE(qkey, CONCAT(COALESCE(type,'daily'),':',COALESCE(code, regexp_replace(title,'\s+','_','g')))),
  description = COALESCE(description, ''),
  type        = COALESCE(type, 'daily'),
  code        = COALESCE(code, qkey);

-- ограничения после backfill
ALTER TABLE quest_templates
  ALTER COLUMN qkey SET NOT NULL,
  ALTER COLUMN description SET NOT NULL,
  ALTER COLUMN type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='quest_templates_qkey_key'
  ) THEN
    ALTER TABLE quest_templates ADD CONSTRAINT quest_templates_qkey_key UNIQUE (qkey);
  END IF;
END $$;
