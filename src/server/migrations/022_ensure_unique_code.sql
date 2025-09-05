-- 022_ensure_unique_code.sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='quest_templates_code_key') THEN
    ALTER TABLE quest_templates
      ADD CONSTRAINT quest_templates_code_key UNIQUE (code);
  END IF;
END $$;
