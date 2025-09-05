import pg from 'pg';

const NODE_ENV = process.env.NODE_ENV || 'production';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || '',
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
