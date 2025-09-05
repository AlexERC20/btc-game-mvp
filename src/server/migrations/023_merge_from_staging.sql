-- 023_merge_from_staging.sql

-- Ensure quest_templates has required columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quest_templates' AND column_name='scope') THEN
    ALTER TABLE quest_templates ADD COLUMN scope TEXT NOT NULL DEFAULT 'once';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quest_templates' AND column_name='metric') THEN
    ALTER TABLE quest_templates ADD COLUMN metric TEXT NOT NULL DEFAULT 'count';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quest_templates' AND column_name='type') THEN
    ALTER TABLE quest_templates ADD COLUMN type TEXT NOT NULL DEFAULT 'count';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quest_templates' AND column_name='title') THEN
    ALTER TABLE quest_templates ADD COLUMN title TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quest_templates' AND column_name='description') THEN
    ALTER TABLE quest_templates ADD COLUMN description TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quest_templates' AND column_name='reward_type') THEN
    ALTER TABLE quest_templates ADD COLUMN reward_type TEXT NOT NULL DEFAULT 'USD';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quest_templates' AND column_name='reward_value') THEN
    ALTER TABLE quest_templates ADD COLUMN reward_value INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quest_templates' AND column_name='cooldown_hours') THEN
    ALTER TABLE quest_templates ADD COLUMN cooldown_hours INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quest_templates' AND column_name='active') THEN
    ALTER TABLE quest_templates ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quest_templates' AND column_name='updated_at') THEN
    ALTER TABLE quest_templates ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Ensure unique constraint on code
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='quest_templates_code_uniq') THEN
    ALTER TABLE quest_templates ADD CONSTRAINT quest_templates_code_uniq UNIQUE (code);
  END IF;
END $$;

-- Merge from staging
INSERT INTO quest_templates
  (code, scope, metric, type, title, description,
   reward_type, reward_value, cooldown_hours, active, updated_at)
SELECT
  s.code,
  CASE WHEN s.scope = 'oneoff' THEN 'once' ELSE s.scope END AS scope,
  s.metric,
  s.metric AS type,
  s.title,
  s.descr AS description,
  'USD'        AS reward_type,
  s.reward_usd AS reward_value,
  s.cooldown_hours,
  TRUE         AS active,
  NOW()        AS updated_at
FROM quest_templates_staging s
ON CONFLICT (code)
DO UPDATE SET
  scope          = EXCLUDED.scope,
  metric         = EXCLUDED.metric,
  type           = EXCLUDED.type,
  title          = EXCLUDED.title,
  description    = EXCLUDED.description,
  reward_type    = EXCLUDED.reward_type,
  reward_value   = EXCLUDED.reward_value,
  cooldown_hours = EXCLUDED.cooldown_hours,
  active         = TRUE,
  updated_at     = NOW();

-- Remove obsolete columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quest_templates' AND column_name='reward_usd') THEN
    ALTER TABLE quest_templates DROP COLUMN reward_usd;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quest_templates' AND column_name='frequency') THEN
    ALTER TABLE quest_templates DROP COLUMN frequency;
  END IF;
END $$;
