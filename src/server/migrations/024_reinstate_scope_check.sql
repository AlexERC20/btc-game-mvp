-- 024_reinstate_scope_check.sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='quest_templates_scope_chk') THEN
    ALTER TABLE quest_templates
      ADD CONSTRAINT quest_templates_scope_chk
      CHECK (scope = ANY (ARRAY['once','daily','weekly']::text[]));
  END IF;
END $$;
