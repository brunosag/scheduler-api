import { createClient } from '@libsql/client';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';

function getEnv(name: string) {
	const value = process.env[name];
	if (!value) {
		console.error(`${name} environment variable is missing.`);
		process.exit(1);
	}
	return value;
}

function getDB() {
	const client = createClient({
		url: getEnv('DB_URL'),
		authToken: getEnv('DB_AUTH_TOKEN'),
	});
	const db = drizzle(client);
	return db;
}

const db = getDB();
