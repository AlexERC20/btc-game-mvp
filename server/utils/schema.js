export async function ensureSchema(pool) {
  // quest_templates: создать если нет
  await pool.query(`
    CREATE TABLE IF NOT EXISTS quest_templates (
      id           BIGSERIAL PRIMARY KEY,
      title        TEXT        NOT NULL,
      description  TEXT        NOT NULL DEFAULT '',
      code         TEXT        UNIQUE,
      reward_usd   INTEGER     NOT NULL DEFAULT 0,
      reward_vop   INTEGER     NOT NULL DEFAULT 0,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Добавить недостающие колонки на старых базах
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='quest_templates' AND column_name='description'
      ) THEN
        ALTER TABLE quest_templates ADD COLUMN description TEXT NOT NULL DEFAULT '';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='quest_templates' AND column_name='code'
      ) THEN
        ALTER TABLE quest_templates ADD COLUMN code TEXT;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='quest_templates' AND column_name='reward_usd'
      ) THEN
        ALTER TABLE quest_templates ADD COLUMN reward_usd INTEGER NOT NULL DEFAULT 0;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='quest_templates' AND column_name='reward_vop'
      ) THEN
        ALTER TABLE quest_templates ADD COLUMN reward_vop INTEGER NOT NULL DEFAULT 0;
      END IF;
    END $$;
  `);

  // Заполнить code и description, сделать уникальным/NOT NULL
  await pool.query(`
    UPDATE quest_templates
       SET code = lower(regexp_replace(title, '[^a-zA-Z0-9]+', '_', 'g'))
     WHERE (code IS NULL OR code = '');

    UPDATE quest_templates
       SET description = COALESCE(description, '')
     WHERE description IS NULL;

    WITH d AS (
      SELECT id, code, row_number() OVER (PARTITION BY code ORDER BY id) AS rn
      FROM quest_templates
    )
    UPDATE quest_templates q
       SET code = q.code || '_' || d.rn
      FROM d
     WHERE q.id = d.id AND d.rn > 1;

    CREATE UNIQUE INDEX IF NOT EXISTS quest_templates_code_uidx
      ON quest_templates(code);

    ALTER TABLE quest_templates
      ALTER COLUMN code SET NOT NULL,
      ALTER COLUMN description SET NOT NULL;
  `);

  // daily_friend_activity: для лимитов по друзьям
  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_friend_activity (
      id               BIGSERIAL PRIMARY KEY,
      friend_user_id   BIGINT       NOT NULL,
      referrer_user_id BIGINT       NOT NULL,
      activity_date    DATE         NOT NULL,
      first_event_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
      UNIQUE (friend_user_id, activity_date)
    );

    CREATE INDEX IF NOT EXISTS dfa_referrer_date_idx
      ON daily_friend_activity (referrer_user_id, activity_date);
  `);

  // quest_daily: прогресс ежедневных квестов
  await pool.query(`
    CREATE TABLE IF NOT EXISTS quest_daily (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      quest_code TEXT NOT NULL,
      day_key DATE NOT NULL,
      progress JSONB NOT NULL DEFAULT '{}'::jsonb,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE (user_id, quest_code, day_key)
    );
    CREATE INDEX IF NOT EXISTS idx_qd_user_day
      ON quest_daily (user_id, day_key);
  `);
}

