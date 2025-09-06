CREATE TABLE IF NOT EXISTS service_status (
  name       TEXT PRIMARY KEY,
  state      TEXT NOT NULL DEFAULT 'booting',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_status_state_chk
    CHECK (state IN ('booting','migrating','ready','error'))
);

INSERT INTO service_status (name, state)
VALUES ('srv','booting')
ON CONFLICT (name) DO NOTHING;
