import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';
import { ENV } from '../config/env';

export const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
});

export const db = drizzle(pool, {
  schema,
});