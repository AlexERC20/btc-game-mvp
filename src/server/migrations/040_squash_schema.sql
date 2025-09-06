BEGIN;

-- 2.1 Schema revisions table
CREATE TABLE IF NOT EXISTS schema_revisions (
  id        bigserial PRIMARY KEY,
  version   integer NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- If already at version >=1, exit
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_revisions WHERE version >= 1) THEN
    RAISE NOTICE 'schema already at version >= 1; skipping';
    RETURN;
  END IF;
END $$;

-- 2.2 Synchronize quest_templates structure

-- Rename descr -> description if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='quest_templates' AND column_name='descr'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='quest_templates' AND column_name='description'
  ) THEN
    EXECUTE 'ALTER TABLE quest_templates RENAME COLUMN descr TO description';
  END IF;
END $$;

-- Add missing columns
ALTER TABLE quest_templates
  ADD COLUMN IF NOT EXISTS description     TEXT,
  ADD COLUMN IF NOT EXISTS frequency       TEXT,
  ADD COLUMN IF NOT EXISTS active          BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS reward_type     TEXT,
  ADD COLUMN IF NOT EXISTS reward_value    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cooldown_hours  INTEGER NOT NULL DEFAULT 0;

-- Handle legacy state column
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='quest_templates' AND column_name='state') THEN
    EXECUTE $sql$
      UPDATE quest_templates SET active =
        CASE
          WHEN state IN ('active','enabled','true','t','1') THEN TRUE
          WHEN state IN ('inactive','disabled','false','f','0') THEN FALSE
          ELSE COALESCE(active, TRUE)
        END
    $sql$;
    EXECUTE 'ALTER TABLE quest_templates DROP COLUMN state';
  END IF;
END $$;

-- Migrate rewards from old fields
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='quest_templates' AND column_name='reward_usd') THEN
    EXECUTE $sql$
      UPDATE quest_templates
      SET reward_type='USD', reward_value = COALESCE(reward_usd,0)
      WHERE reward_type IS NULL OR reward_value IS NULL
    $sql$;
    EXECUTE 'ALTER TABLE quest_templates DROP COLUMN reward_usd';
  END IF;
END $$;

-- Ensure NOT NULL fields have values
UPDATE quest_templates SET
  description     = COALESCE(description, ''),
  frequency       = COALESCE(frequency, 'once'),
  reward_type     = COALESCE(reward_type, 'USD'),
  reward_value    = COALESCE(reward_value, 0),
  cooldown_hours  = COALESCE(cooldown_hours, 0);

-- 2.3 Normalize values and add constraints softly
ALTER TABLE quest_templates
  DROP CONSTRAINT IF EXISTS quest_templates_frequency_chk,
  DROP CONSTRAINT IF EXISTS quest_templates_metric_chk,
  DROP CONSTRAINT IF EXISTS quest_templates_reward_type_check;

ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_frequency_chk
  CHECK (frequency IN ('once','daily','weekly')) NOT VALID;

ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_metric_chk
  CHECK (metric IN ('count','usd','vop','xp')) NOT VALID;

ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_reward_type_check
  CHECK (reward_type IN ('USD','VOP','XP')) NOT VALID;

UPDATE quest_templates SET frequency = 'once'
 WHERE frequency IS NULL OR TRIM(frequency) = ''
    OR LOWER(frequency) IN ('oneoff','onceoff','one-of','one_of');

UPDATE quest_templates SET frequency = 'daily'
 WHERE LOWER(frequency) IN ('everyday','dialy','daliy');

UPDATE quest_templates SET frequency = 'weekly'
 WHERE LOWER(frequency) IN ('everyweek','week');

UPDATE quest_templates SET metric = 'count'
 WHERE LOWER(metric) IN ('counts','cnt');

ALTER TABLE quest_templates
  VALIDATE CONSTRAINT quest_templates_frequency_chk;
ALTER TABLE quest_templates
  VALIDATE CONSTRAINT quest_templates_metric_chk;
ALTER TABLE quest_templates
  VALIDATE CONSTRAINT quest_templates_reward_type_check;

-- 2.4 Handle staging table merge
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_name='quest_templates_staging') THEN
    EXECUTE $sql$
      INSERT INTO quest_templates (code, scope, metric, goal, title, description,
                                   frequency, active, reward_type, reward_value, cooldown_hours)
      SELECT
        code, scope, metric, goal, title, COALESCE(descr, description, ''),
        COALESCE(frequency, 'once'), TRUE,
        COALESCE(reward_type, 'USD'),
        COALESCE(reward_value, reward_usd, 0),
        COALESCE(cooldown_hours, 0)
      FROM quest_templates_staging s
      ON CONFLICT (code) DO UPDATE
      SET scope = EXCLUDED.scope,
          metric = EXCLUDED.metric,
          goal = EXCLUDED.goal,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          frequency = EXCLUDED.frequency,
          active = EXCLUDED.active,
          reward_type = EXCLUDED.reward_type,
          reward_value = EXCLUDED.reward_value,
          cooldown_hours = EXCLUDED.cooldown_hours;
    $sql$;
    EXECUTE 'DROP TABLE quest_templates_staging';
  END IF;
END $$;

-- Drop old triggers referencing qkey
DROP TRIGGER IF EXISTS quest_templates_ai ON quest_templates;

-- 2.5 Ensure unique index on code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'ux_quest_templates_code'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX ux_quest_templates_code ON quest_templates(code)';
  END IF;
END $$;

-- 2.6 Record schema version
INSERT INTO schema_revisions(version) VALUES (1);

COMMIT;
