import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const pool = process.env.NODE_ENV === "production"
    ? new Pool({ connectionString: process.env.PRODUCTION_DB_URL })
    : process.env.LOCAL_DB_URL
      ? new Pool({ connectionString: process.env.LOCAL_DB_URL })
      : new Pool({
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'darwint',
          ssl: false,
        });

export const db = drizzle(pool, { schema });

export { pool }; 