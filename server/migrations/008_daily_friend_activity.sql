CREATE TABLE IF NOT EXISTS daily_friend_activity (
  id SERIAL PRIMARY KEY,
  friend_user_id INT NOT NULL REFERENCES users(id),
  referrer_user_id INT NOT NULL REFERENCES users(id),
  activity_date DATE NOT NULL,
  first_event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (friend_user_id, activity_date)
);
