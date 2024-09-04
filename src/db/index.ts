import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/libsql';
import { getEnv } from '../utils.ts';

config({ path: '.env' });

const client = createClient({
	url: getEnv('DB_URL'),
	authToken: getEnv('DB_AUTH_TOKEN'),
});

export const db = drizzle(client);
