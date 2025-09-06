-- 034_ensure_service_state.sql
BEGIN;

CREATE TABLE IF NOT EXISTS service_state (
  skey       text PRIMARY KEY,
  state      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- На случай старых таблиц — добить недостающие колонки
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='service_state' AND column_name='state'
  ) THEN
    ALTER TABLE service_state ADD COLUMN state text;
    UPDATE service_state SET state='ready' WHERE state IS NULL;
    ALTER TABLE service_state ALTER COLUMN state SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='service_state' AND column_name='updated_at'
  ) THEN
    ALTER TABLE service_state ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END$$;

COMMIT;
