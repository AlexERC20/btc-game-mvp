BEGIN;

-- временно позволим NULL, чтобы обновить старые строки
ALTER TABLE quest_templates
  ALTER COLUMN goal DROP NOT NULL;

-- проставим goal=1 там, где NULL
UPDATE quest_templates
SET goal = 1
WHERE goal IS NULL;

-- зафиксируем дефолт и вернём NOT NULL
ALTER TABLE quest_templates
  ALTER COLUMN goal SET DEFAULT 1,
  ALTER COLUMN goal SET NOT NULL;

COMMIT;
