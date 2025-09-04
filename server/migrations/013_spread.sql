-- Spread tracking tables
CREATE TABLE IF NOT EXISTS spread_tracks (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  dex_pair TEXT NOT NULL,
  chain TEXT,
  status TEXT NOT NULL DEFAULT 'idle',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_spread_at TIMESTAMPTZ,
  last_converged_at TIMESTAMPTZ,
  cooldown_until TIMESTAMPTZ,
  UNIQUE(exchange, symbol, dex_pair)
);

CREATE TABLE IF NOT EXISTS spread_events (
  id SERIAL PRIMARY KEY,
  track_id INT REFERENCES spread_tracks(id),
  kind TEXT NOT NULL,
  cex_price NUMERIC,
  dex_price NUMERIC,
  spread_bps INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spread_rewards (
  id SERIAL PRIMARY KEY,
  track_id INT REFERENCES spread_tracks(id),
  user_id INT REFERENCES users(id),
  reward_type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
