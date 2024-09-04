export function errorAndExit(message: string): never {
	console.error(message);
	process.exit(1);
}

export function getEnv(name: string) {
	const value = process.env[name];
	if (!value) {
		errorAndExit(`${name} environment variable is missing.`);
	}
	return value;
}
