BEGIN;

-- 3.1. Создаём колонку scope, если вдруг её нет
ALTER TABLE quest_templates
    ADD COLUMN IF NOT EXISTS scope TEXT;

-- 3.2. Снимаем старый чек-констрейнт, если он есть
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'quest_templates'
      AND constraint_name = 'quest_templates_scope_chk'
  ) THEN
    EXECUTE 'ALTER TABLE quest_templates DROP CONSTRAINT quest_templates_scope_chk';
  END IF;
END $$;

-- 3.3. Нормализуем значения по регистру
UPDATE quest_templates
SET scope = LOWER(scope)
WHERE scope IS NOT NULL;

-- 3.4. Маппим распространённые синонимы в канонические значения
UPDATE quest_templates SET scope = 'daily'    WHERE scope IN ('day','daily_task');
UPDATE quest_templates SET scope = 'weekly'   WHERE scope IN ('week','weekly_task');
UPDATE quest_templates SET scope = 'lifetime' WHERE scope IN ('permanent','lifetime','season','global','system');
UPDATE quest_templates SET scope = 'one_off'  WHERE scope IN ('once','one','onetime','one-off');

-- 3.5. Заполняем NULL безопасным значением (лучше 'lifetime')
UPDATE quest_templates SET scope = 'lifetime' WHERE scope IS NULL;

-- 3.6. Ставим новый чек-констрейнт (ВАРИАНТ В — супerset)
ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_scope_chk
  CHECK (scope IN ('daily','weekly','lifetime','season','global','once','one_off'))
  NOT VALID;

-- 3.7. Валидация после правок данных
ALTER TABLE quest_templates VALIDATE CONSTRAINT quest_templates_scope_chk;

COMMIT;
