BEGIN;

-- 1) Колонки (если не хватает — добавить)
ALTER TABLE quest_templates
  ADD COLUMN IF NOT EXISTS qkey        TEXT,
  ADD COLUMN IF NOT EXISTS title       TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS scope       TEXT,
  ADD COLUMN IF NOT EXISTS goal        INTEGER,
  ADD COLUMN IF NOT EXISTS metric      TEXT,
  ADD COLUMN IF NOT EXISTS reward_usd  NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS reward_vop  INTEGER,
  ADD COLUMN IF NOT EXISTS frequency   TEXT,
  ADD COLUMN IF NOT EXISTS is_enabled  BOOLEAN,
  ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ;

-- 2) Почистить «плохие» данные и выставить дефолты
UPDATE quest_templates
SET scope = 'user'
WHERE scope IS NULL OR scope NOT IN ('user','global');

UPDATE quest_templates
SET metric = 'count'
WHERE metric IS NULL OR metric NOT IN ('count','usd','vop');

UPDATE quest_templates
SET frequency = 'daily'
WHERE frequency IS NULL OR frequency NOT IN ('once','daily','weekly');

UPDATE quest_templates
SET goal = 1
WHERE goal IS NULL OR goal < 1;

ALTER TABLE quest_templates
  ALTER COLUMN qkey        SET NOT NULL,
  ALTER COLUMN title       SET NOT NULL,
  ALTER COLUMN description SET NOT NULL,
  ALTER COLUMN scope       SET NOT NULL,
  ALTER COLUMN goal        SET NOT NULL,
  ALTER COLUMN metric      SET NOT NULL,
  ALTER COLUMN reward_usd  SET DEFAULT 0,
  ALTER COLUMN reward_vop  SET DEFAULT 0,
  ALTER COLUMN frequency   SET NOT NULL,
  ALTER COLUMN is_enabled  SET DEFAULT TRUE;

ALTER TABLE quest_templates
  ALTER COLUMN scope     SET DEFAULT 'user',
  ALTER COLUMN metric    SET DEFAULT 'count',
  ALTER COLUMN frequency SET DEFAULT 'daily';

-- 3) Уникальность qkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename='quest_templates' AND indexname='uq_quest_templates_qkey'
  ) THEN
    CREATE UNIQUE INDEX uq_quest_templates_qkey ON quest_templates(qkey);
  END IF;
END $$;

-- 4) Снести старые чек-констрейнты, если есть (имена могут отличаться)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='quest_templates_scope_chk') THEN
    ALTER TABLE quest_templates DROP CONSTRAINT quest_templates_scope_chk;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='quest_templates_metric_chk') THEN
    ALTER TABLE quest_templates DROP CONSTRAINT quest_templates_metric_chk;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='quest_templates_frequency_chk') THEN
    ALTER TABLE quest_templates DROP CONSTRAINT quest_templates_frequency_chk;
  END IF;
END $$;

-- 5) Создать новые, НО как NOT VALID (не валидируем весь стол сразу)
ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_scope_chk
    CHECK (scope IN ('user','global')) NOT VALID;

ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_metric_chk
    CHECK (metric IN ('count','usd','vop')) NOT VALID;

ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_frequency_chk
    CHECK (frequency IN ('once','daily','weekly')) NOT VALID;

COMMIT;
