-- 023_merge_from_staging.sql
INSERT INTO quest_templates (code, frequency, metric, goal, title, descr, reward_usd, cooldown_hours)
SELECT code, frequency, metric, goal, title, descr, reward_usd, cooldown_hours
FROM quest_templates_staging
ON CONFLICT (code) DO UPDATE
  SET frequency = EXCLUDED.frequency,
      metric = EXCLUDED.metric,
      goal = EXCLUDED.goal,
      title = EXCLUDED.title,
      descr = EXCLUDED.descr,
      reward_usd = EXCLUDED.reward_usd,
      cooldown_hours = EXCLUDED.cooldown_hours;
