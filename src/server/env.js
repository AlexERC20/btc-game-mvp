function number(v, d) { const n = parseInt(v ?? '', 10); return Number.isFinite(n) ? n : d; }

const REQUIRED = {
  // для миграций нужен только доступ к БД
  migrate: ['DATABASE_URL'],

  // для основного сервера — БД и токен бота;
  // PUBLIC_URL желателен, но не обязателен (имеем фолбэк)
  server: ['DATABASE_URL', 'TELEGRAM_BOT_TOKEN'],
};

export function loadEnv(profile = 'server') {
  const e = {
    NODE_ENV: process.env.NODE_ENV || 'production',
    DATABASE_URL: process.env.DATABASE_URL || '',
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    BOT_USERNAME: process.env.BOT_USERNAME || process.env.TG_BOT_USERNAME || '',
    TG_WEBHOOK_SECRET: process.env.TG_WEBHOOK_SECRET || '',
    // PUBLIC_URL допускаем пустым — ниже будет фолбэк
    PUBLIC_URL: process.env.PUBLIC_URL
      || process.env.RENDER_EXTERNAL_URL
      || '',
    PORT: number(process.env.PORT, 10000),
  };

  const need = REQUIRED[profile] || [];
  const missing = need.filter(k => !e[k]);
  if (missing.length) {
    throw new Error(`[env] Missing ${missing.join(', ')}`);
  }
  return e;
}

export const isProd = () => (process.env.NODE_ENV || 'production') === 'production';
