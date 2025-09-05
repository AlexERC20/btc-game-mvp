-- Reinstate scope constraint via lookup table
CREATE TABLE IF NOT EXISTS quest_scopes (
  scope TEXT PRIMARY KEY
);

INSERT INTO quest_scopes(scope)
SELECT DISTINCT scope FROM (
  SELECT scope FROM quest_templates
  UNION
  SELECT scope FROM quest_templates_staging
) s
ON CONFLICT DO NOTHING;

ALTER TABLE quest_templates
  DROP CONSTRAINT IF EXISTS quest_templates_scope_fk;
ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_scope_fk
  FOREIGN KEY (scope) REFERENCES quest_scopes(scope);

ALTER TABLE quest_templates
  DROP CONSTRAINT IF EXISTS quest_templates_scope_check;
