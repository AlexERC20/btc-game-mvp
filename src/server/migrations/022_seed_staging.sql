-- 022_seed_staging.sql
-- ВСТАВЛЯТЬ ТОЛЬКО В STAGING!
-- Пример — замени на свои записи
INSERT INTO quest_templates_staging (code, scope, metric, goal, title, descr, reward_usd, cooldown_hours) VALUES
('JOIN_TG',      'oneoff', 'count', 1,   'Join our TG',      'user joins telegram', 200, 0),
('CLASSIC_10',   'daily',  'count', 10,  'Classic 10',       'make 10 classic bets', 50,  0),
('ARENA_5',      'daily',  'count', 5,   'Arena 5',          '5 arena bids',         75,  0),
('INVITE_1',     'oneoff', 'count', 1,   'Invite a friend',  'bring a friend',       100, 0)
ON CONFLICT (code) DO NOTHING;
