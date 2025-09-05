-- 023_merge_from_staging.sql

INSERT INTO quest_templates (
  code,
  frequency,
  metric,
  goal,
  title,
  description,           -- <== В ЦЕЛИ description
  reward_usd,
  cooldown_hours,
  qkey
)
SELECT
  s.code,
  s.scope        AS frequency,
  s.metric,
  s.goal,
  s.title,
  s.descr        AS description,    -- <== ИЗ STAGING берём descr
  s.reward_usd,
  s.cooldown_hours,
  (s.code || ':' || s.scope || ':' || s.metric) AS qkey
FROM quest_templates_staging s
ON CONFLICT (code) DO UPDATE
SET
  frequency      = EXCLUDED.frequency,
  metric         = EXCLUDED.metric,
  goal           = EXCLUDED.goal,
  title          = EXCLUDED.title,
  description    = EXCLUDED.description,  -- <== Тоже description
  reward_usd     = EXCLUDED.reward_usd,
  cooldown_hours = EXCLUDED.cooldown_hours,
  qkey           = EXCLUDED.qkey;
