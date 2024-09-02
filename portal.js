export async function signIn(page, user, password) {
	await page.type('#usuario', user);
	await page.type('#senha', password);
	await page.click('input[name="login"]', { waitUntil: 'networkidle0' });
	await page.goto('https://www1.ufrgs.br/intranet/portal/public/index.php?cods=1,1,1,224', {
		waitUntil: 'networkidle0',
	});
	console.log('✓ Signed in');
}

export async function accessPortal(page, user, password) {
	await page.goto('https://www1.ufrgs.br/sistemas/portal', {
		waitUntil: 'networkidle0',
	});
	console.log('✓ Login page loaded');
	await signIn(page, user, password);
}

export async function getCursos(page) {
	let cursos = [];
	const selectElement = await page.$('#selecionado');
	cursos = await selectElement.$$eval('option', (options) =>
		options.slice(1).map((option) => ({ value: option.value, nome: option.textContent.trim() }))
	);
	console.log('✓ Courses obtained');
	return cursos;
}

export async function getCadeiras(page, id) {
	// open curso selection if not visible
	const alterarButton = await page.$('text=[alterar]');
	if (alterarButton) {
		await alterarButton.click();
	}

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
