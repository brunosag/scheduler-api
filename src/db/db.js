import 'dotenv/config';
const { createClient } = require('@libsql/client');

const client = createClient({ url: process.env.DATABASE_URL, authToken:  });
	