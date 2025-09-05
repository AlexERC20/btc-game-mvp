-- 014_fix_quest_templates.sql

-- 1. Добавляем отсутствующие столбцы, безопасно
ALTER TABLE quest_templates
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS scope TEXT,
  ADD COLUMN IF NOT EXISTS code TEXT;

-- 2. Дефолты и NOT NULL
ALTER TABLE quest_templates
  ALTER COLUMN description SET DEFAULT '',
  ALTER COLUMN scope SET DEFAULT 'user';

UPDATE quest_templates SET description = '' WHERE description IS NULL;
UPDATE quest_templates SET scope       = 'user' WHERE scope IS NULL;

-- 3. Гарантируем qkey: unique, нижний регистр
-- если qkey пуст — собираем из type/code или из title
UPDATE quest_templates
SET qkey = LOWER(
  COALESCE(qkey,
           CASE
             WHEN code IS NOT NULL AND code <> '' THEN CONCAT(type, ':', code)
             ELSE CONCAT(type, ':', REGEXP_REPLACE(LOWER(title), '\\s+', '_', 'g'))
           END))
WHERE qkey IS NULL OR qkey = '';

-- 4. Индекс по qkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = 'idx_quest_templates_qkey_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_quest_templates_qkey_unique
      ON quest_templates (qkey);
  END IF;
END $$;
