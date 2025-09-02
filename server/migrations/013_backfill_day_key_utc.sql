UPDATE daily_caps
SET day_key_utc = FLOOR(EXTRACT(EPOCH FROM (day_utc::timestamp AT TIME ZONE 'UTC')) / 86400)
WHERE day_key_utc IS NULL;

UPDATE daily_friend_activity
SET day_key_utc = FLOOR(EXTRACT(EPOCH FROM (first_event_at AT TIME ZONE 'UTC')) / 86400)
WHERE day_key_utc IS NULL;
