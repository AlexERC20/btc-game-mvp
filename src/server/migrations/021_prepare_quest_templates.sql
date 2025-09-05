-- Prepare quest_templates table for merge
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='quest_templates' AND column_name='description'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='quest_templates' AND column_name='descr'
  ) THEN
    ALTER TABLE quest_templates RENAME COLUMN description TO descr;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='quest_templates' AND column_name='type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='quest_templates' AND column_name='scope'
  ) THEN
    ALTER TABLE quest_templates RENAME COLUMN type TO scope;
  END IF;
END $$;

ALTER TABLE quest_templates
  ADD COLUMN IF NOT EXISTS code  TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS descr TEXT,
  ADD COLUMN IF NOT EXISTS metric TEXT,
  ADD COLUMN IF NOT EXISTS goal INTEGER,
  ADD COLUMN IF NOT EXISTS reward_usd INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_vop INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qkey TEXT,
  ADD COLUMN IF NOT EXISTS scope TEXT;

ALTER TABLE quest_templates
  DROP CONSTRAINT IF EXISTS quest_templates_scope_check;

ALTER TABLE quest_templates
  ALTER COLUMN descr DROP NOT NULL,
  ALTER COLUMN metric DROP NOT NULL,
  ALTER COLUMN goal DROP NOT NULL,
  ALTER COLUMN qkey DROP NOT NULL,
  ALTER COLUMN scope DROP NOT NULL;
