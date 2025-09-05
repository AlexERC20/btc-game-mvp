-- 014_fix_quest_templates.sql

-- 1. Добавляем отсутствующие столбцы, безопасно
  ALTER TABLE quest_templates
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS frequency TEXT,
    ADD COLUMN IF NOT EXISTS code TEXT;

-- 2. Дефолты и NOT NULL
  ALTER TABLE quest_templates
    ALTER COLUMN description SET DEFAULT '',
    ALTER COLUMN frequency SET DEFAULT 'user';

  UPDATE quest_templates SET description = '' WHERE description IS NULL;
  UPDATE quest_templates SET frequency   = 'user' WHERE frequency IS NULL;

-- 3. Уникальность кода
CREATE UNIQUE INDEX IF NOT EXISTS idx_quest_templates_code_unique
  ON quest_templates (code);
