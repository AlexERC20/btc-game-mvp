-- Merge quest templates from staging into main table

-- 1) Backfill legacy rows with default values
UPDATE quest_templates
SET
  code       = COALESCE(code, CONCAT('LEGACY_', id::text)),
  descr      = COALESCE(descr, ''),
  metric     = COALESCE(metric, 'custom'),
  goal       = COALESCE(goal, 1),
  qkey       = COALESCE(qkey, CONCAT('legacy.', id::text)),
  scope      = COALESCE(scope, 'legacy')
WHERE code IS NULL OR descr IS NULL OR metric IS NULL OR goal IS NULL OR qkey IS NULL OR scope IS NULL;

-- 2) Upsert canonical templates
INSERT INTO quest_templates (code, title, descr, scope, metric, goal, reward_usd, reward_vop, qkey)
SELECT s.code, s.title, s.descr, s.scope, s.metric, s.goal, s.reward_usd, s.reward_vop, s.qkey
FROM quest_templates_staging s
ON CONFLICT (code)
DO UPDATE SET
  title      = EXCLUDED.title,
  descr      = EXCLUDED.descr,
  scope      = EXCLUDED.scope,
  metric     = EXCLUDED.metric,
  goal       = EXCLUDED.goal,
  reward_usd = EXCLUDED.reward_usd,
  reward_vop = EXCLUDED.reward_vop,
  qkey       = EXCLUDED.qkey;
