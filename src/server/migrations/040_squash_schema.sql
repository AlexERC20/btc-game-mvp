-- 040_squash_schema.sql

-- 1) Базовая таблица (совмещаем старые и новые эры схемы)
CREATE TABLE IF NOT EXISTS quest_templates (
  code            TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  descr           TEXT NOT NULL,

  -- метрика и цель
  metric          TEXT NOT NULL CHECK (metric IN ('count','usd','vop')),
  goal            INTEGER NOT NULL CHECK (goal > 0),

  -- эпоха А: scope (oneoff|daily|weekly)
  scope           TEXT NOT NULL DEFAULT 'daily'
                    CHECK (scope IN ('oneoff','daily','weekly')),

  -- эпоха B: frequency (once|daily|weekly) — поддержим оба названия,
  -- чтобы ни одна старая миграция/код не падали
  frequency       TEXT,
  
  -- награда (универсально)
  reward_type     TEXT NOT NULL DEFAULT 'USD'
                    CHECK (reward_type IN ('USD','VOP','XP')),
  reward_value    INTEGER NOT NULL DEFAULT 0 CHECK (reward_value >= 0),

  -- cooldown и признак активности
  cooldown_hours  INTEGER NOT NULL DEFAULT 0 CHECK (cooldown_hours >= 0),
  active          BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2) Синхронизируем "frequency" со "scope" (если колонка существует)
ALTER TABLE quest_templates
  ALTER COLUMN frequency DROP NOT NULL;

UPDATE quest_templates
SET frequency = COALESCE(frequency,
  CASE scope
    WHEN 'oneoff' THEN 'once'
    WHEN 'daily'  THEN 'daily'
    WHEN 'weekly' THEN 'weekly'
    ELSE 'daily'
  END
);

-- 3) Сносим/пересоздаём конфликтующие CHECK-и с предсказуемыми именами
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quest_templates_metric_chk') THEN
    ALTER TABLE quest_templates DROP CONSTRAINT quest_templates_metric_chk;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quest_templates_reward_type_check') THEN
    ALTER TABLE quest_templates DROP CONSTRAINT quest_templates_reward_type_check;
  END IF;
END $$;

ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_metric_chk
    CHECK (metric IN ('count','usd','vop')) NOT VALID;

ALTER TABLE quest_templates
  ADD CONSTRAINT quest_templates_reward_type_check
    CHECK (reward_type IN ('USD','VOP','XP')) NOT VALID;

-- 4) Чистим данные, которые могли нарушать новые чек-констрейнты
UPDATE quest_templates
SET metric = 'count'
WHERE metric NOT IN ('count','usd','vop') OR metric IS NULL;

UPDATE quest_templates
SET reward_type = 'USD'
WHERE reward_type NOT IN ('USD','VOP','XP') OR reward_type IS NULL;

UPDATE quest_templates
SET reward_value = 0
WHERE reward_value IS NULL OR reward_value < 0;

-- Normalize legacy frequency values before validating the check
UPDATE public.quest_templates
SET frequency = CASE
  WHEN frequency IS NULL OR btrim(frequency) = '' THEN 'once'
  WHEN lower(frequency) IN ('oneoff','one-off','onceoff','one','one_time') THEN 'once'
  WHEN lower(frequency) IN ('day') THEN 'daily'
  WHEN lower(frequency) IN ('week') THEN 'weekly'
  ELSE lower(frequency)
END
WHERE frequency IS NULL
   OR frequency NOT IN ('once','daily','weekly')
   OR lower(frequency) IN ('oneoff','one-off','onceoff','one','one_time','day','week');

-- Recreate and validate the check constraint
ALTER TABLE public.quest_templates
  DROP CONSTRAINT IF EXISTS quest_templates_frequency_chk;

ALTER TABLE public.quest_templates
  ADD CONSTRAINT quest_templates_frequency_chk
  CHECK (frequency = ANY (ARRAY['once','daily','weekly'])) NOT VALID;

ALTER TABLE public.quest_templates
  VALIDATE CONSTRAINT quest_templates_frequency_chk;

-- 5) Валидируем констрейнты (когда данные уже починены)
ALTER TABLE quest_templates VALIDATE CONSTRAINT quest_templates_metric_chk;
ALTER TABLE quest_templates VALIDATE CONSTRAINT quest_templates_reward_type_check;

-- 6) На всякий: убираем артефакты прошлых эпох
-- 'state', 'qkey' и т. п. — если вдруг остались
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='quest_templates' AND column_name='state'
  ) THEN
    ALTER TABLE quest_templates DROP COLUMN state;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='quest_templates' AND column_name='qkey'
  ) THEN
    ALTER TABLE quest_templates DROP COLUMN qkey;
  END IF;
END $$;
