import dotenv from 'dotenv';
import process from 'process';

dotenv.config();

const required = ['DATABASE_URL','PUBLIC_URL'];
for (const k of required) {
  if (!process.env[k]) {
    console.error(`[env] Missing ${k}`);
    process.exit(1);
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PUBLIC_URL: process.env.PUBLIC_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  TG_BOT_TOKEN: process.env.TG_BOT_TOKEN || null,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'dev',
  ENABLE_GAME_LOOP: process.env.ENABLE_GAME_LOOP === '1',
  ENABLE_PRICE_FEED: process.env.ENABLE_PRICE_FEED === '1',
  ENABLE_BOTS: process.env.ENABLE_BOTS === '1',
  ROUND_LENGTH_SEC: Number(process.env.ROUND_LENGTH_SEC || 60),
  API_ORIGIN: process.env.API_ORIGIN || null,
};

console.log(`[env] PUBLIC_URL=${env.PUBLIC_URL}`);
console.log(`[env] ENABLE_*: gameLoop=${env.ENABLE_GAME_LOOP?1:0} priceFeed=${env.ENABLE_PRICE_FEED?1:0} bots=${env.ENABLE_BOTS?1:0}`);
