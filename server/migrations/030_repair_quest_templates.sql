BEGIN;

-- 1) ENUM for scope
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quest_scope') THEN
    CREATE TYPE quest_scope AS ENUM ('daily','weekly','arena','farm','classic','ref','system');
  END IF;
END$$;

-- 2) Drop existing CHECK to allow fixes
ALTER TABLE quest_templates
  DROP CONSTRAINT IF EXISTS quest_templates_scope_check;

-- 4) Normalize existing scope values
UPDATE quest_templates SET scope = LOWER(scope);

UPDATE quest_templates
SET scope = CASE
  WHEN scope IN ('d','day','daily')            THEN 'daily'
  WHEN scope IN ('w','week','weekly')          THEN 'weekly'
  WHEN scope = 'arena'                         THEN 'arena'
  WHEN scope IN ('farm','$','money')           THEN 'farm'
  WHEN scope IN ('classic','game')             THEN 'classic'
  WHEN scope IN ('ref','referral','invite')    THEN 'ref'
  WHEN scope IS NULL OR scope = ''             THEN 'system'
  ELSE 'system'
END;

-- 5) Ensure NOT NULL/defaults
ALTER TABLE quest_templates
  ALTER COLUMN code  SET NOT NULL,
  ALTER COLUMN goal  SET NOT NULL,
  ALTER COLUMN metric SET NOT NULL,
  ALTER COLUMN description SET DEFAULT '' NOT NULL,
  ALTER COLUMN scope SET NOT NULL;

-- 6) Reinstate CHECK with whitelist
ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_scope_check
  CHECK (scope IN ('daily','weekly','arena','farm','classic','ref','system'));

-- 7) Unique index on (code, scope)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_quest_templates_code_scope'
  ) THEN
    CREATE UNIQUE INDEX uq_quest_templates_code_scope
      ON quest_templates(code, scope);
  END IF;
END$$;

COMMIT;
