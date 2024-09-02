import 'dotenv/config';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { getRequirements } from '../requirements.js';
// import { getDB } from './db.js';
// import { accessPortal, getCadeiras, getCursos } from './portal.js';

const { DB_URI, PORTAL_USER, PORTAL_PASSWORD } = process.env;
const envVars = { DB_URI, PORTAL_USER, PORTAL_PASSWORD };
for (const [name, value] of Object.entries(envVars)) {
	if (!value) {
		console.error(`${name} environment variable is missing.`);
		process.exit(1);
	}
}

puppeteer.use(StealthPlugin());
const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1024 });

const requirements = await getRequirements(page);

// await accessPortal(page, PORTAL_USER, PORTAL_PASSWORD);
// const cursos = await getCursos(page);

// const cadeiras = [];
// const cursosCount = cursos.length;
// for (const [index, curso] of cursos.entries()) {
// 	const cursoCadeiras = await getCadeiras(page, curso.value);
// 	if (cursoCadeiras.length > 0) {
// 		cadeiras.push({ curso_value: curso.value, cadeiras: cursoCadeiras });
// 	}
// 	console.log(`✓ ${curso.nome} (${index + 1}/${cursosCount})`);
// }
await browser.close();

// const filteredCursos = cursos.filter((curso) => cadeiras.some((cadeira) => cadeira.curso_value === curso.value));

// const { db, client } = await getDB(DB_URI);
// await db.dropDatabase();
// await db.collection('cursos').insertMany(filteredCursos);
// await db.collection('cadeiras').insertMany(cadeiras);
// console.log('✓ All programs and courses stored');
// await client.close();

console.log('✓ Done');
