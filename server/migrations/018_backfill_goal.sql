BEGIN;
ALTER TABLE quest_templates ALTER COLUMN goal DROP NOT NULL;
UPDATE quest_templates SET goal = 1 WHERE goal IS NULL;
ALTER TABLE quest_templates ALTER COLUMN goal SET NOT NULL;
COMMIT;
