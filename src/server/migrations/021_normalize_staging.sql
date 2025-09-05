-- 021_normalize_staging.sql
-- Normalize scope values in staging table to match production enum
UPDATE quest_templates_staging
   SET scope = CASE scope WHEN 'oneoff' THEN 'once' ELSE scope END;
