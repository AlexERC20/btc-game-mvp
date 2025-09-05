-- 023_merge_from_staging.sql

INSERT INTO quest_templates (
  code,
  frequency,
  metric,
  goal,
  title,
  description,
  reward_type,          -- << добавили
  reward_usd,
  cooldown_hours,
  qkey
)
SELECT
  s.code,
  s.scope              AS frequency,
  s.metric,
  s.goal,
  s.title,
  s.descr              AS description,
  CASE
    WHEN s.reward_usd IS NOT NULL AND s.reward_usd > 0 THEN 'USD'
    ELSE 'XP'
  END                  AS reward_type,   -- << заполняем NOT NULL поле
  COALESCE(s.reward_usd, 0) AS reward_usd,
  s.cooldown_hours,
  (s.code || ':' || s.scope || ':' || s.metric) AS qkey
FROM quest_templates_staging s
ON CONFLICT (code) DO UPDATE
SET
  frequency      = EXCLUDED.frequency,
  metric         = EXCLUDED.metric,
  goal           = EXCLUDED.goal,
  title          = EXCLUDED.title,
  description    = EXCLUDED.description,
  reward_type    = EXCLUDED.reward_type,     -- << тоже обновляем
  reward_usd     = EXCLUDED.reward_usd,
  cooldown_hours = EXCLUDED.cooldown_hours,
  qkey           = EXCLUDED.qkey;
