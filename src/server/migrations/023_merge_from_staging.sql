-- 023_merge_from_staging.sql
-- Переносим данные из staging в боевую таблицу, маппим имена и типы.
-- Требования к целевой таблице: поля
-- code, frequency, metric, goal, title, description, reward_type, reward_value, cooldown_hours

INSERT INTO quest_templates (
  code,
  frequency,
  metric,
  goal,
  title,
  description,
  reward_type,
  reward_value,
  cooldown_hours
)
SELECT
  s.code,
  s.scope::text            AS frequency,      -- 'oneoff'/'daily'/'weekly' уже нормализованы на шаге 021
  s.metric,
  s.goal,
  s.title,
  s.descr                  AS description,    -- staging.descr -> quest_templates.description
  'USD'::text              AS reward_type,    -- у нас в staging только reward_usd
  s.reward_usd::integer    AS reward_value,   -- не даём NULL, иначе NOT NULL нарушится
  s.cooldown_hours::integer
FROM quest_templates_staging s
ON CONFLICT (code) DO UPDATE SET
  frequency      = EXCLUDED.frequency,
  metric         = EXCLUDED.metric,
  goal           = EXCLUDED.goal,
  title          = EXCLUDED.title,
  description    = EXCLUDED.description,
  reward_type    = EXCLUDED.reward_type,
  reward_value   = EXCLUDED.reward_value,
  cooldown_hours = EXCLUDED.cooldown_hours;
