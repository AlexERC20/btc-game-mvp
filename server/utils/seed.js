export async function seedQuestTemplates(pool) {
  await pool.query(`
    INSERT INTO quest_templates (code, title, description, reward_usd, reward_vop)
    VALUES
      ('ARENA_10_WINS',  'Выиграй 10 раз на Арене', 'Победи в 10 раундах Арены', 500, 0),
      ('ARENA_100_BETS', 'Сделай 100 ставок на Арене', 'Любые направления', 500, 0),
      ('ARENA_100_BUY',  '100 ставок BUY', 'Только BUY', 300, 0),
      ('ARENA_100_SELL', '100 ставок SELL', 'Только SELL', 300, 0),
      ('INVITE_3',       'Пригласи 3 друга', 'Друзья должны зайти в игру', 1000, 0)
    ON CONFLICT (code) DO NOTHING;
  `);
}

