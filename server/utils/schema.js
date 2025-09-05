export async function ensureSchema(pool) {
  // Таблица активности друзей по дням (UTC)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_friend_activity (
      id BIGSERIAL PRIMARY KEY,
      friend_user_id BIGINT NOT NULL,
      referrer_user_id BIGINT NOT NULL,
      activity_date DATE NOT NULL, -- UTC date
      first_event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (friend_user_id, activity_date)
    );
    CREATE INDEX IF NOT EXISTS idx_dfa_referrer_date
      ON daily_friend_activity (referrer_user_id, activity_date);
  `);

  // Таблицы квестов/прогресса (если ещё не созданы)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS quest_templates (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      reward_usd INT NOT NULL DEFAULT 0,
      reward_vop INT NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quest_daily (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      quest_code TEXT NOT NULL,
      day_key DATE NOT NULL, -- UTC date
      progress JSONB NOT NULL DEFAULT '{}'::jsonb,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE (user_id, quest_code, day_key)
    );
    CREATE INDEX IF NOT EXISTS idx_qd_user_day
      ON quest_daily (user_id, day_key);
  `);
}

export async function seedQuestTemplates(pool) {
  // Мягкий сид — не перезатирает
  await pool.query(`
    INSERT INTO quest_templates (code, title, description, reward_usd, reward_vop)
    VALUES
      ('ARENA_10_WINS', 'Выиграй 10 раз на Арене', 'Победи в 10 раундах Арены', 500, 0),
      ('ARENA_100_BETS', 'Сделай 100 ставок на Арене', 'Любые направления', 500, 0),
      ('ARENA_100_BUY', '100 ставок BUY', 'Только BUY в Арене', 300, 0),
      ('ARENA_100_SELL', '100 ставок SELL', 'Только SELL в Арене', 300, 0),
      ('INVITE_3', 'Пригласи 3 друга', 'Пусть зайдут в игру', 1000, 0)
    ON CONFLICT (code) DO NOTHING;
  `);
}
