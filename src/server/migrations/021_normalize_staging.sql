-- 021_normalize_staging.sql
UPDATE quest_templates_staging
SET frequency = CASE lower(scope)
  WHEN 'oneoff' THEN 'once'
  WHEN 'one_time' THEN 'once'
  WHEN 'once' THEN 'once'
  WHEN 'daily' THEN 'daily'
  WHEN 'weekly' THEN 'weekly'
  ELSE 'once'
END;

UPDATE quest_templates_staging
SET metric = CASE lower(metric)
  WHEN 'count' THEN 'count'
  WHEN 'usd' THEN 'usd'
  WHEN 'vop' THEN 'vop'
  ELSE 'count'
END;
