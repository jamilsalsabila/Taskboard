import { Pool } from 'pg';
import { env } from '../config/env.js';

export const pool = new Pool(env.db);

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});
