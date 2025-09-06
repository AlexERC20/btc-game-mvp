-- 033_sync_service_status.sql

-- 1) Создадим таблицу, если её нет
CREATE TABLE IF NOT EXISTS service_status (
  name       TEXT PRIMARY KEY,
  state      TEXT NOT NULL DEFAULT 'booting',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Если колонка state отсутствует, но есть legacy-колонка status — переименуем
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
      EXECUTE 'ALTER TABLE service_status RENAME COLUMN status TO state';
    ELSE
      EXECUTE 'ALTER TABLE service_status ADD COLUMN state TEXT';
    END IF;
  END IF;
END$$;

-- 3) Обязательные атрибуты и ограничения
ALTER TABLE service_status
  ALTER COLUMN state SET NOT NULL;

ALTER TABLE service_status
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE service_status
  DROP CONSTRAINT IF EXISTS service_status_state_chk;

ALTER TABLE service_status
  ADD CONSTRAINT service_status_state_chk
  CHECK (state IN ('booting','ready','error')) NOT VALID;

ALTER TABLE service_status
  VALIDATE CONSTRAINT service_status_state_chk;

-- 4) Базовая запись о сервисе
INSERT INTO service_status (name, state)
VALUES ('srv','booting')
ON CONFLICT (name)
DO UPDATE SET state = EXCLUDED.state, updated_at = now();
