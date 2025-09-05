-- 021b_drop_qkey_triggers.sql
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tg.tgname,
           tg.tgrelid::regclass AS tbl,
           p.oid::regprocedure AS proc_regproc
    FROM pg_trigger tg
    JOIN pg_proc p ON p.oid = tg.tgfoid
    WHERE tg.tgrelid = 'public.quest_templates'::regclass
      AND NOT tg.tgisinternal
      AND pg_get_functiondef(p.oid) ILIKE '%qkey%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s;', r.tgname, r.tbl);
    EXECUTE format('DROP FUNCTION IF EXISTS %s;', r.proc_regproc);
  END LOOP;
END $$;
