-- 021_drop_scope_check_if_exists.sql
ALTER TABLE quest_templates DROP CONSTRAINT IF EXISTS quest_templates_scope_check;
ALTER TABLE quest_templates DROP CONSTRAINT IF EXISTS quest_templates_scope_chk;
ALTER TABLE quest_templates DROP CONSTRAINT IF EXISTS quest_templates_frequency_check;
ALTER TABLE quest_templates DROP CONSTRAINT IF EXISTS quest_templates_frequency_chk;
