-- 033_sync_quest_templates_schema.sql
-- Привести таблицу quest_templates к актуальной схеме, не ломая старые данные.

BEGIN;

-- 0) На всякий случай: если таблица вдруг отсутствует — создать «скелет»
CREATE TABLE IF NOT EXISTS quest_templates (
  id              bigserial PRIMARY KEY,
  code            text
);

-- 1) Переименования «на лету»
-- Если есть старое имя description -> привести к descr
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='quest_templates' AND column_name='description') AND
     NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='quest_templates' AND column_name='descr') THEN
    ALTER TABLE quest_templates RENAME COLUMN description TO descr;
  END IF;
END$$;

-- 2) Добавить все требуемые колонки, если их нет
ALTER TABLE quest_templates
  ADD COLUMN IF NOT EXISTS title           text,
  ADD COLUMN IF NOT EXISTS descr           text,
  ADD COLUMN IF NOT EXISTS metric          text,
  ADD COLUMN IF NOT EXISTS goal            integer,
  ADD COLUMN IF NOT EXISTS reward_type     text,
  ADD COLUMN IF NOT EXISTS reward_value    integer,
  ADD COLUMN IF NOT EXISTS cooldown_hours  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frequency       text,     -- новое имя вместо scope
  ADD COLUMN IF NOT EXISTS qkey            text,
  ADD COLUMN IF NOT EXISTS active          boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at      timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at      timestamptz NOT NULL DEFAULT now();

-- 3) Удалить/пересоздать старые чек-констрейнты (если были)
ALTER TABLE quest_templates
  DROP CONSTRAINT IF EXISTS quest_templates_scope_check,
  DROP CONSTRAINT IF EXISTS quest_templates_metric_chk,
  DROP CONSTRAINT IF EXISTS quest_templates_frequency_chk,
  DROP CONSTRAINT IF EXISTS quest_templates_reward_type_check,
  DROP CONSTRAINT IF EXISTS quest_templates_qkey_key;

-- 4) Бэкофиллы
-- qkey = code (если пусто)
UPDATE quest_templates
   SET qkey = code
 WHERE qkey IS NULL;

-- frequency: если есть колонка scope — скопировать из неё, иначе проставить 'daily'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='quest_templates' AND column_name='scope') THEN
    UPDATE quest_templates
       SET frequency = COALESCE(frequency, scope);
  END IF;
  UPDATE quest_templates
     SET frequency = 'daily'
   WHERE frequency IS NULL;
END$$;

-- sane defaults, чтобы не упасть на SET NOT NULL
UPDATE quest_templates SET title = COALESCE(title, code) WHERE title IS NULL;
UPDATE quest_templates SET descr = COALESCE(descr, '')    WHERE descr IS NULL;
UPDATE quest_templates SET metric = COALESCE(metric, 'count') WHERE metric IS NULL;
UPDATE quest_templates SET goal = COALESCE(goal, 1) WHERE goal IS NULL;
UPDATE quest_templates SET reward_type = COALESCE(reward_type, 'USD') WHERE reward_type IS NULL;
UPDATE quest_templates SET reward_value = COALESCE(reward_value, 0) WHERE reward_value IS NULL;
UPDATE quest_templates SET cooldown_hours = COALESCE(cooldown_hours, 0) WHERE cooldown_hours IS NULL;
UPDATE quest_templates SET active = COALESCE(active, true) WHERE active IS NULL;

-- 5) Теперь можно зафиксировать NOT NULL там, где нужно
ALTER TABLE quest_templates
  ALTER COLUMN code            SET NOT NULL,
  ALTER COLUMN qkey            SET NOT NULL,
  ALTER COLUMN metric          SET NOT NULL,
  ALTER COLUMN goal            SET NOT NULL,
  ALTER COLUMN title           SET NOT NULL,
  ALTER COLUMN descr           SET NOT NULL,
  ALTER COLUMN reward_type     SET NOT NULL,
  ALTER COLUMN reward_value    SET NOT NULL,
  ALTER COLUMN cooldown_hours  SET NOT NULL,
  ALTER COLUMN frequency       SET NOT NULL,
  ALTER COLUMN active          SET NOT NULL;

-- 6) Уникальность qkey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='quest_templates_qkey_key') THEN
    ALTER TABLE quest_templates
      ADD CONSTRAINT quest_templates_qkey_key UNIQUE (qkey);
  END IF;
END$$;

-- 7) Актуальные CHECKи (без NOT VALID)
ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_metric_chk
    CHECK (metric IN ('count','usd','vop')),
  ADD CONSTRAINT quest_templates_frequency_chk
    CHECK (frequency IN ('oneoff','daily','weekly')),
  ADD CONSTRAINT quest_templates_reward_type_check
    CHECK (reward_type IN ('USD','VOP','XP'));

COMMIT;
