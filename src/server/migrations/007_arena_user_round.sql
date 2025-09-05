CREATE TABLE IF NOT EXISTS arena_user_round (
  round_id   INT NOT NULL,
  user_id    INT NOT NULL REFERENCES users(id),
  bets_used  INT NOT NULL DEFAULT 0,
  refreshed  BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (round_id, user_id)
);
