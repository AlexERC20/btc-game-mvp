DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='service_status' AND column_name='state'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='service_status' AND column_name='status'
    ) THEN
      ALTER TABLE service_status RENAME COLUMN status TO state;
    ELSE
      ALTER TABLE service_status ADD COLUMN state TEXT NOT NULL DEFAULT 'booting';
    END IF;
  END IF;

  BEGIN
    ALTER TABLE service_status DROP CONSTRAINT IF EXISTS service_status_state_chk;
    ALTER TABLE service_status
      ADD CONSTRAINT service_status_state_chk
      CHECK (state IN ('booting','migrating','ready','error'));
  EXCEPTION WHEN others THEN
    -- молча продолжаем (идемпотентность важнее)
  END;

  INSERT INTO service_status (name, state)
  VALUES ('srv','booting')
  ON CONFLICT (name) DO NOTHING;
END$$;
