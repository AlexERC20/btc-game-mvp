-- 030_fix_quest_templates_schema.sql
BEGIN;

-- 1) Снимаем старые чек-констрейнты, если есть (НИКАКОГО "NOT VALID" при DROP)
ALTER TABLE quest_templates
  DROP CONSTRAINT IF EXISTS quest_templates_scope_check,
  DROP CONSTRAINT IF EXISTS quest_templates_metric_chk,
  DROP CONSTRAINT IF EXISTS quest_templates_frequency_chk,
  DROP CONSTRAINT IF EXISTS quest_templates_reward_type_check,
  DROP CONSTRAINT IF EXISTS quest_templates_qkey_key;

-- 2) Гарантируем наличие новых столбцов (ничего не удаляем)
ALTER TABLE quest_templates
  ADD COLUMN IF NOT EXISTS qkey          text,
  ADD COLUMN IF NOT EXISTS reward_type   text,
  ADD COLUMN IF NOT EXISTS reward_value  integer,
  ADD COLUMN IF NOT EXISTS active        boolean DEFAULT true;

-- 3) Заполняем qkey из code, если пусто
UPDATE quest_templates SET qkey = code WHERE qkey IS NULL;

-- 4) Делим операции ALTER на отдельные выражения, чтобы не ловить синтаксис у SET NOT NULL
--    (SET NOT NULL допустимо только отдельной командой)
ALTER TABLE quest_templates
  ALTER COLUMN qkey SET NOT NULL;

-- 5) Уникальность qkey (через проверку существования констрейнта)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'quest_templates_qkey_key'
  ) THEN
    ALTER TABLE quest_templates
      ADD CONSTRAINT quest_templates_qkey_key UNIQUE (qkey);
  END IF;
END$$;

-- 6) Актуальные чек-констрейнты (без NOT VALID; если нужно — можно VALIDATE отдельно)
ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_metric_chk
    CHECK (metric IN ('count','usd','vop')),
  ADD CONSTRAINT quest_templates_frequency_chk
    CHECK (frequency IN ('oneoff','daily','weekly')),
  ADD CONSTRAINT quest_templates_reward_type_check
    CHECK (reward_type IN ('USD','VOP','XP'));

COMMIT;
