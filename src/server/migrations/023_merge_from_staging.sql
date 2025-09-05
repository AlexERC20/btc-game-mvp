-- 023_merge_from_staging.sql
INSERT INTO quest_templates (code, scope, metric, goal, title, description, reward_usd, cooldown_hours)
SELECT
  s.code,
  s.scope,
  s.metric,
  s.goal,
  s.title,
  s.descr,
  s.reward_usd,
  s.cooldown_hours
FROM quest_templates_staging s
ON CONFLICT (code) DO UPDATE
SET scope = EXCLUDED.scope,
    metric = EXCLUDED.metric,
    goal = EXCLUDED.goal,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    reward_usd = EXCLUDED.reward_usd,
    cooldown_hours = EXCLUDED.cooldown_hours;
