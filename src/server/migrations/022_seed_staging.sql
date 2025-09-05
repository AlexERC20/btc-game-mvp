-- Seed canonical quest templates into staging
INSERT INTO quest_templates_staging (code, title, descr, scope, metric, goal, reward_usd, reward_vop, qkey) VALUES
  ('ARENA_20_BETS', 'Сделай 20 ставок в арене', 'За раунд сделай 20 ставок', 'arena_round', 'arena_bets', 20, 0, 25, 'arena.round.20bets'),
  ('BUY_100', '100 ставок BUY', 'Сделай 100 покупок', 'daily', 'buy', 100, 0, 30, 'classic.buy.100'),
  ('SELL_100', '100 ставок SELL', 'Сделай 100 продаж', 'daily', 'sell', 100, 0, 30, 'classic.sell.100'),
  ('INVITE_3', 'Позови 3 друга', '3 друга по реф-ссылке', 'lifetime', 'invite', 3, 1000, 0, 'referral.3')
ON CONFLICT (code) DO UPDATE
SET title=EXCLUDED.title, descr=EXCLUDED.descr, scope=EXCLUDED.scope,
    metric=EXCLUDED.metric, goal=EXCLUDED.goal,
    reward_usd=EXCLUDED.reward_usd, reward_vop=EXCLUDED.reward_vop, qkey=EXCLUDED.qkey;
