-- 015_normalize_quest_templates_descr.sql

DO $$
BEGIN
  -- Если осталась старая колонка `descr`:
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='quest_templates' AND column_name='descr'
  ) THEN
    -- Если новой `description` ещё нет — просто переименуем
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='quest_templates' AND column_name='description'
    ) THEN
      ALTER TABLE quest_templates RENAME COLUMN descr TO description;
    ELSE
      -- Иначе перенесём данные и удалим старую
      ALTER TABLE quest_templates ALTER COLUMN descr DROP NOT NULL;
      UPDATE quest_templates
         SET description = COALESCE(description, descr)
       WHERE descr IS NOT NULL;
      ALTER TABLE quest_templates DROP COLUMN descr;
    END IF;
  END IF;

  -- Гарантируем, что `description` есть и не NULL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='quest_templates' AND column_name='description'
  ) THEN
    ALTER TABLE quest_templates ADD COLUMN description TEXT;
  END IF;

  -- Заполним пустоты и зададим дефолт
  UPDATE quest_templates SET description = '' WHERE description IS NULL;
  ALTER TABLE quest_templates ALTER COLUMN description SET DEFAULT '';

  -- Остальные поля тоже добьём (на случай старых баз)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='quest_templates' AND column_name='scope'
  ) THEN
    ALTER TABLE quest_templates ADD COLUMN scope TEXT;
  END IF;
  UPDATE quest_templates SET scope = 'user' WHERE scope IS NULL;
  ALTER TABLE quest_templates ALTER COLUMN scope SET DEFAULT 'user';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='quest_templates' AND column_name='code'
  ) THEN
    ALTER TABLE quest_templates ADD COLUMN code TEXT;
  END IF;

  -- Единый уникальный ключ по qkey
  DO $uniq$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname='public'
        AND indexname='idx_quest_templates_qkey_unique'
    ) THEN
      CREATE UNIQUE INDEX idx_quest_templates_qkey_unique
        ON quest_templates (qkey);
    END IF;
  END
  $uniq$;

END
$$;
