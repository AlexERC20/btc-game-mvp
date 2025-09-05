ALTER TABLE quest_templates DROP CONSTRAINT IF EXISTS quest_templates_scope_chk;
ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_scope_chk CHECK (scope IN ('user','global'));
