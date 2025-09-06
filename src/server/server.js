import { loadEnv } from './env.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';
import { ensureBootstrap, startServices } from './bootstrap.js';
import health from './routes/health.js';
import status from './routes/status.js';
import diag from './routes/diag.js';
import tgDebug from './routes/tg-debug.js';
import debugRoutes from './routes/debug.js';

const env = loadEnv('server');
process.env.TZ = 'UTC';

const app = express();
app.set('trust proxy', true);
if (env.API_ORIGIN) {
  app.use(cors({ origin: [env.API_ORIGIN, 'https://web.telegram.org', /\.telegram\.org$/] }));
}
app.use(express.json());

app.locals.env = env;

app.use((req, _res, next) => {
  // базовый URL пригодится роутам/линкам
  req.baseUrlExt = env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  next();
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));

app.use(health);
app.use(status);
app.use(diag);
app.use(tgDebug);
app.use(debugRoutes);

app.get('/api/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  console.log(`[sse] client connected ip=${req.ip}`);
  const timer = setInterval(() => {
    res.write('data: {"type":"ping"}\n\n');
  }, 30000);
  req.on('close', () => clearInterval(timer));
});

const services = {
  startPriceFeed: () => {},
  startGameLoop: () => {},
  startBots: () => {},
};

async function boot() {
  try {
    await pool.query('SELECT 1');
    console.log('[db] connected ok');
    const round = await ensureBootstrap(pool, env);
    if (round) {
      console.log(`[bootstrap] current round id=${round.id}, state=${round.state}, endsAt=${round.ends_at}`);
    }
    startServices(env, services);
  } catch (e) {
    console.error('[srv] startup failed:', e);
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    const shown = env.PUBLIC_URL || `http://localhost:${env.PORT}`;
    console.log(`[boot] listening at ${shown}`);
  });
}

boot();

process.on('unhandledRejection', (r) => console.error('[unhandledRejection]', r));
process.on('uncaughtException',  (e) => { console.error('[uncaughtException]', e); process.exit(1); });
