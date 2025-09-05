BEGIN;

-- гарантируем все нужные колонки (id уже есть)
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

-- нормализация существующих строк
UPDATE quest_templates SET scope='user'
WHERE scope IS NULL OR scope NOT IN ('user','global');

UPDATE quest_templates SET metric='count'
WHERE metric IS NULL OR metric NOT IN ('count','usd','vop');

UPDATE quest_templates SET frequency='daily'
WHERE frequency IS NULL OR frequency NOT IN ('once','daily','weekly');

UPDATE quest_templates SET goal=1 WHERE goal IS NULL OR goal < 1;

-- дефолты
ALTER TABLE quest_templates
  ALTER COLUMN scope       SET DEFAULT 'user',
  ALTER COLUMN metric      SET DEFAULT 'count',
  ALTER COLUMN frequency   SET DEFAULT 'daily',
  ALTER COLUMN is_enabled  SET DEFAULT TRUE,
  ALTER COLUMN reward_usd  SET DEFAULT 0,
  ALTER COLUMN reward_vop  SET DEFAULT 0;

-- NOT NULL для критичных полей
ALTER TABLE quest_templates
  ALTER COLUMN qkey        SET NOT NULL,
  ALTER COLUMN title       SET NOT NULL,
  ALTER COLUMN description SET NOT NULL,
  ALTER COLUMN scope       SET NOT NULL,
  ALTER COLUMN goal        SET NOT NULL,
  ALTER COLUMN metric      SET NOT NULL,
  ALTER COLUMN frequency   SET NOT NULL;

-- уникальность по ключу квеста
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename='quest_templates' AND indexname='uq_quest_templates_qkey'
  ) THEN
    CREATE UNIQUE INDEX uq_quest_templates_qkey ON quest_templates(qkey);
  END IF;
END $$;

COMMIT;
