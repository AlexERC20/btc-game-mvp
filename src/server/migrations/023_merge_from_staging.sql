-- 023_merge_from_staging.sql

-- 1) Подготовка целевой таблицы: добавляем недостающие колонки с дефолтами
ALTER TABLE quest_templates
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS type   text    NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS reward_type  text    NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS reward_value integer NOT NULL DEFAULT 0;

-- 2) Перенос из staging c явным маппингом полей
INSERT INTO quest_templates
  (code, scope, metric, goal, title, descr, reward_type, reward_value, cooldown_hours, active, type)
SELECT
  s.code,
  s.scope,
  s.metric,
  s.goal,
  s.title,
  s.descr,
  'USD'::text               AS reward_type,   -- staging хранит reward_usd
  s.reward_usd              AS reward_value,
  s.cooldown_hours,
  true                      AS active,
  'system'::text            AS type
FROM quest_templates_staging s
ON CONFLICT (code) DO UPDATE
SET scope          = EXCLUDED.scope,
    metric         = EXCLUDED.metric,
    goal           = EXCLUDED.goal,
    title          = EXCLUDED.title,
    descr          = EXCLUDED.descr,
    reward_type    = EXCLUDED.reward_type,
    reward_value   = EXCLUDED.reward_value,
    cooldown_hours = EXCLUDED.cooldown_hours,
    active         = EXCLUDED.active,
    type           = EXCLUDED.type;
