import type { Config } from 'drizzle-kit';

import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

export default {
	schema: './src/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	...(process.env.NODE_ENV === 'production'
		? { dbCredentials: { url: process.env.PRODUCTION_DB_URL } }
		: {
			dbCredentials: process.env.LOCAL_DB_URL
				? { url: process.env.LOCAL_DB_URL }
				: {
					host: process.env.DB_HOST || 'localhost',
					port: parseInt(process.env.DB_PORT || '5432'),
					user: process.env.DB_USER || 'postgres',
					password: process.env.DB_PASSWORD || 'postgres',
					database: process.env.DB_NAME || 'darwint',
					ssl: false,
				}
		}
	),

} satisfies Config; 
