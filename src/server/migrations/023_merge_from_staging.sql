-- 023_merge_from_staging.sql
-- Сливаем подготовленные данные из quest_templates_staging в боевую quest_templates.

WITH src AS (
  SELECT
    s.code,
    s.scope,
    s.metric,
    s.goal,
    s.title,
    s.descr AS description,
    COALESCE(s.reward_usd, 0)       AS reward_usd,
    COALESCE(s.cooldown_hours, 24)   AS cooldown_hours
  FROM quest_templates_staging s
)

INSERT INTO quest_templates (
  code,
  qkey,
  title,
  description,
  metric,
  goal,
  reward_type,
  reward_value,
  scope,
  frequency,
  cooldown_hours,
  active
)
SELECT
  s.code,
  -- Пока берём qkey = code, чтобы не падать на NOT NULL/UNIQUE.
  s.code AS qkey,
  s.title,
  s.description,
  CASE WHEN s.metric IN ('count','usd','vop','text') THEN s.metric ELSE 'count' END,
  s.goal,
  -- У нас в staging только reward_usd, поэтому тип 'USD'
  'USD'::text AS reward_type,
  -- КЛЮЧЕВАЯ СТРОКА: заполняем reward_value из reward_usd, не даём NULL
  COALESCE(s.reward_usd, 0) AS reward_value,
  -- Храним исходный scope (oneoff/daily/weekly)
  CASE WHEN s.scope IN ('oneoff','daily','weekly') THEN s.scope ELSE 'oneoff' END AS scope,
  -- frequency: нормализуем к once/daily/weekly
  CASE s.scope
    WHEN 'oneoff' THEN 'once'
    WHEN 'daily'  THEN 'daily'
    WHEN 'weekly' THEN 'weekly'
    ELSE 'once'
  END AS frequency,
  s.cooldown_hours,
  TRUE AS active
FROM src s
ON CONFLICT (code) DO UPDATE
SET
  title          = EXCLUDED.title,
  description    = EXCLUDED.description,
  metric         = EXCLUDED.metric,
  goal           = EXCLUDED.goal,
  reward_type    = EXCLUDED.reward_type,
  reward_value   = EXCLUDED.reward_value,
  scope          = EXCLUDED.scope,
  frequency      = EXCLUDED.frequency,
  cooldown_hours = EXCLUDED.cooldown_hours,
  active         = TRUE;
