const { MongoClient } = require('mongodb');
const puppeteer = require('puppeteer-extra');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function connectDB() {
	if (uri === undefined) {
		throw new Error('Please set MONGODB_URI environment variable');
	}
	await client.connect(uri);
	const db = await client.db('db');
	await db.command({ ping: 1 });
	console.log('✓ Conectado ao MongoDB');

	return db;
}

async function signIn(page) {
	const user = process.env.PORTAL_USER;
	const password = process.env.PORTAL_PASSWORD;

	if (user === undefined || password === undefined) {
		throw new Error('Please set PORTAL_USER and PORTAL_PASSWORD environment variables');
	}

	await page.type('#usuario', user);
	await page.type('#senha', password);
	await page.click('input[name="login"]', { waitUntil: 'networkidle0' });
	await page.goto('https://www1.ufrgs.br/intranet/portal/public/index.php?cods=1,1,1,224', {
		waitUntil: 'networkidle0',
	});
}

async function accessPortal() {
	const browser = await puppeteer.launch({ headless: true });
	const page = await browser.newPage();
	await page.setViewport({ width: 1080, height: 1024 });
	await page.goto('https://www1.ufrgs.br/sistemas/portal', {
		waitUntil: 'networkidle0',
	});
	console.log('✓ Portal acessado');

	await signIn(page);
	console.log('✓ Autenticado');

	return { browser, page };
}

async function getCursos(page) {
	let cursos = [];
	const selectElement = await page.$('#selecionado');
	cursos = await selectElement.$$eval('option', (options) =>
		options.slice(1).map((option) => ({ value: option.value, nome: option.textContent.trim() }))
	);

	return cursos;
}

async function getCadeiras(page, id) {
	// open curso selection if not visible
	try {
		await page.click('text=[alterar]');
	} catch (error) {}

	// select curso
	await page.waitForSelector('#selecionado');
	await page.select('#selecionado', id);

	// select latest semester
	await page.waitForSelector('select[name="PL"]');
	const firstOptionValue = await page.$eval('select[name="PL"] option', (option) => option.value);
	await page.select('select[name="PL"]', firstOptionValue);
	await page.waitForNavigation();

	// get cadeiras information from table
	return page.evaluate(() => {
		const table = document.querySelector('#Horarios tbody');
		if (!table) return [];

		const cadeiras = [];
		let cadeira = null;

		const rows = table.querySelectorAll('tr');
		for (const row of Array.from(rows).slice(1)) {
			const tds = Array.from(row.cells);

			const horarios = Array.from(tds[8].querySelectorAll('li')).map((el) => el.textContent.trim());
			const professores = Array.from(tds[9].querySelectorAll('li')).map((el) => el.textContent.trim());

			const turma = {
				turma: tds[2].textContent.trim(),
				vagas_veteranos: parseInt(tds[3].textContent.trim(), 10),
				vagas_calouros: parseInt(tds[4].textContent.trim(), 10),
				horarios:
					horarios[0] === 'Horário não definido.'
						? []
						: horarios.map((item) => {
								const [dia, horario] = item.split(' ');
								return { dia, horario };
						  }),
				professores:
					professores[0] === 'Professor não definido.'
						? []
						: professores.map((item) => {
								const parts = item.split('-');
								return {
									nome: parts[0].trim(),
									regente: item.includes('Regente'),
									ministrante: item.includes('Ministrante'),
									responsavel_conceito: item.includes('Responsável conceito'),
								};
						  }),
			};

			const cadeiraName = tds[0].textContent.trim();
			if (cadeiraName) {
				if (cadeira) {
					cadeiras.push(cadeira);
				}
				cadeira = {
					nome: cadeiraName,
					creditos: parseInt(tds[1].textContent.trim(), 10),
					turmas: [turma],
				};
			} else if (cadeira) {
				cadeira.turmas.push(turma);
			}
		}

		if (cadeira) {
			cadeiras.push(cadeira);
		}

		return cadeiras;
	});
}

async function main() {
	const { browser, page } = await accessPortal();

	const db = await connectDB();

	const cursos = await getCursos(page);
	const cursosLength = cursos.length;
	console.log('✓ Cursos obtidos');

	const cadeiras = [];
	for (const [index, curso] of cursos.entries()) {
		const cursoCadeiras = await getCadeiras(page, curso.value);
		if (cursoCadeiras.length > 0) {
			cadeiras.push({ curso_value: curso.value, cadeiras: cursoCadeiras });
		}
		console.log(`✓ ${curso.nome} (${index + 1}/${cursosLength})`);
	}

	const cursosFiltered = cursos.filter((curso) => cadeiras.some((cadeira) => cadeira.curso_value === curso.value));

	await db.dropDatabase();
	await db.collection('cursos').insertMany(cursosFiltered);
	await db.collection('cadeiras').insertMany(cadeiras);
	console.log('✓ Todas os cursos e cadeiras inseridas');

	await browser.close();
	await client.close();
	console.log('✓ Navegador e banco de dados encerrados');
}

main().catch((error) => {});
