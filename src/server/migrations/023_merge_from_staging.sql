-- 023_merge_from_staging.sql

-- Приводим целевую таблицу к минимально нужной схеме (безопасно)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='quest_templates' AND column_name='description') THEN
    ALTER TABLE quest_templates ADD COLUMN description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='quest_templates' AND column_name='type') THEN
    ALTER TABLE quest_templates ADD COLUMN type TEXT NOT NULL DEFAULT 'oneoff';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='quest_templates' AND column_name='active') THEN
    ALTER TABLE quest_templates ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='quest_templates' AND column_name='reward_type') THEN
    ALTER TABLE quest_templates ADD COLUMN reward_type TEXT NOT NULL DEFAULT 'USD';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='quest_templates' AND column_name='reward_value') THEN
    ALTER TABLE quest_templates ADD COLUMN reward_value INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='quest_templates' AND column_name='frequency') THEN
    ALTER TABLE quest_templates ADD COLUMN frequency TEXT NOT NULL DEFAULT 'once';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='quest_templates' AND column_name='cooldown_hours') THEN
    ALTER TABLE quest_templates ADD COLUMN cooldown_hours INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Уникальность кода (если ещё нет)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='quest_templates_code_uniq') THEN
    ALTER TABLE quest_templates ADD CONSTRAINT quest_templates_code_uniq UNIQUE (code);
  END IF;
END $$;

-- Нормализация значений в staging перед мёрджем
UPDATE quest_templates_staging
   SET scope = CASE scope WHEN 'oneoff' THEN 'once' ELSE scope END;

-- Собственно мёрдж (апсерт)
INSERT INTO quest_templates (
  code, title, description, metric, goal,
  reward_type, reward_value, frequency, cooldown_hours,
  active, type
)
SELECT
  s.code,
  s.title,
  s.descr,
  s.metric,
  s.goal,
  'USD'::text,
  COALESCE(s.reward_usd, 0),
  s.scope,
  COALESCE(s.cooldown_hours, 0),
  TRUE,
  CASE WHEN s.scope = 'once' THEN 'oneoff' ELSE 'recurring' END
FROM quest_templates_staging s
ON CONFLICT (code) DO UPDATE SET
  title          = EXCLUDED.title,
  description    = EXCLUDED.description,
  metric         = EXCLUDED.metric,
  goal           = EXCLUDED.goal,
  reward_type    = EXCLUDED.reward_type,
  reward_value   = EXCLUDED.reward_value,
  frequency      = EXCLUDED.frequency,
  cooldown_hours = EXCLUDED.cooldown_hours,
  active         = EXCLUDED.active,
  type           = EXCLUDED.type;

-- Удаляем устаревшие колонки, если они остались
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quest_templates' AND column_name='scope') THEN
    ALTER TABLE quest_templates DROP COLUMN scope;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quest_templates' AND column_name='reward_usd') THEN
    ALTER TABLE quest_templates DROP COLUMN reward_usd;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quest_templates' AND column_name='qkey') THEN
    ALTER TABLE quest_templates DROP COLUMN qkey;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quest_templates' AND column_name='descr') THEN
    ALTER TABLE quest_templates DROP COLUMN descr;
  END IF;
END $$;
