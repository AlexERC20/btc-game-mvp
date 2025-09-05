BEGIN;

-- Нормализация исторических данных (одноразово)
UPDATE quest_templates
SET scope = 'user'
WHERE scope IS NULL OR lower(scope) NOT IN ('user','global');

-- Гарантируем CHECK (не удаляем его)
ALTER TABLE quest_templates
  DROP CONSTRAINT IF EXISTS quest_templates_scope_check;
ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_scope_check
  CHECK (scope IN ('user','global'));

-- Быстрый upsert по уникальному ключу qkey (если нет - создать заранее)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'uq_quest_templates_qkey'
  ) THEN
    CREATE UNIQUE INDEX uq_quest_templates_qkey ON quest_templates(qkey);
  END IF;
END $$;

-- Функция: перенос + нормализация
CREATE OR REPLACE FUNCTION merge_quest_templates_from_staging()
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO
    quest_templates (
      qkey, title, description, goal, metric, scope, reward_usd, weight, enabled, meta
    )
  SELECT
    trim(s.qkey),
    nullif(trim(s.title), '')          AS title,
    nullif(trim(s.description), '')    AS description,
    COALESCE(s.goal, 1)                AS goal,
    COALESCE(NULLIF(trim(s.metric), ''), 'count') AS metric,
    -- КЛЮЧЕВОЕ: нормализуем scope до допустимого множества
    CASE
      WHEN lower(s.scope) IN ('user','global') THEN lower(s.scope)
      ELSE 'user'
    END                                 AS scope,
    COALESCE(s.reward_usd, 0),
    COALESCE(s.weight, 100),
    COALESCE(s.enabled, true),
    COALESCE(s.meta, '{}')
  FROM quest_templates_staging s
  WHERE s.qkey IS NOT NULL
  ON CONFLICT (qkey) DO UPDATE SET
    title        = EXCLUDED.title,
    description  = EXCLUDED.description,
    goal         = EXCLUDED.goal,
    metric       = EXCLUDED.metric,
    scope        = EXCLUDED.scope,
    reward_usd   = EXCLUDED.reward_usd,
    weight       = EXCLUDED.weight,
    enabled      = EXCLUDED.enabled,
    meta         = EXCLUDED.meta;

  -- staging очищаем после успешного мерджа
  TRUNCATE quest_templates_staging;
$$;

COMMIT;
