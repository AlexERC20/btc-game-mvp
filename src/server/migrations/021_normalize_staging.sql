-- 021_normalize_staging.sql
UPDATE quest_templates_staging
SET metric = CASE lower(metric)
  WHEN 'count' THEN 'count'
  WHEN 'usd' THEN 'usd'
  WHEN 'vop' THEN 'vop'
  ELSE 'count'
END;
