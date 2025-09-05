-- normalize existing scope values
UPDATE quest_templates
SET scope = 'user'
WHERE scope IS NULL OR scope NOT IN ('user','global');
