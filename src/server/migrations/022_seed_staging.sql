-- 022_seed_staging.sql
INSERT INTO quest_templates_staging (code, scope, metric, goal, title, descr, reward_usd, cooldown_hours) VALUES
  ('sub_erc20coin', 'oneoff', 'misc', 1, 'Подписка на @erc20coin', 'Однажды подпишись на канал', 30000, 0),
  ('daily_login',   'daily',  'login', 1, 'Ежедневный вход', 'Заходи в игру раз в день', 1000, 24),
  ('invite_friend', 'oneoff', 'referral', 1, 'Пригласи друга', 'Друг должен стать активным', 500, 0)
ON CONFLICT (code) DO NOTHING;
