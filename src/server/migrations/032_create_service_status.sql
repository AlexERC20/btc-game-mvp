-- 032_create_service_status.sql

CREATE TABLE IF NOT EXISTS service_status (
  name        TEXT PRIMARY KEY,
  ok          BOOLEAN NOT NULL DEFAULT TRUE,
  details     JSONB   NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
