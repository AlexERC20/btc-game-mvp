-- 021_drop_scope_check_if_exists.sql
DO $$
DECLARE cname text;
BEGIN
  SELECT c.conname INTO cname
  FROM   pg_constraint c
  JOIN   pg_class t ON t.oid = c.conrelid
  WHERE  t.relname = 'quest_templates'
  AND    c.contype = 'c'
  AND    pg_get_constraintdef(c.oid) ILIKE '%scope%';

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE quest_templates DROP CONSTRAINT %I;', cname);
  END IF;
END$$;
