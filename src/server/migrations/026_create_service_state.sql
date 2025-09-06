CREATE TABLE IF NOT EXISTS service_state (
  id boolean PRIMARY KEY DEFAULT TRUE,
  state text NOT NULL DEFAULT 'idle',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO service_state(id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;
