import { defineConfig } from 'drizzle-kit';
import { getEnv } from './src/utils.ts';

export default defineConfig({
	schema: './src/db/schema.ts',
	out: './migrations',
	dialect: 'sqlite',
	driver: 'turso',
	dbCredentials: {
		url: getEnv('DB_URL'),
		authToken: getEnv('DB_AUTH_TOKEN'),
	},
});
