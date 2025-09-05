-- 024_reinstate_frequency_check.sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='quest_templates_frequency_chk') THEN
    ALTER TABLE quest_templates
      ADD CONSTRAINT quest_templates_frequency_chk
      CHECK (frequency = ANY (ARRAY['once','daily','weekly']::text[]));
  END IF;
END $$;
