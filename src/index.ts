import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { InsertCourse, InsertProgram, InsertProgramCourse } from './db/schema';
import { errorAndExit, getEnv } from './utils';

puppeteer.use(StealthPlugin());

puppeteer
	.launch({ headless: false })
	.then(async (browser) => {
		const page = await browser.newPage();
		await page.goto('https://www1.ufrgs.br/sistemas/portal/');
		await page.type('#usuario', getEnv('PORTAL_USER'));
		await page.type('#senha', getEnv('PORTAL_PASSWORD'));
		await page.click('input[name="login"]');
		await page.waitForNetworkIdle();
		await page.goto(
			'https://www1.ufrgs.br/intranet/portal/public/index.php?cods=1,1,1,224',
		);

		const programSelectEl = await page.$('#selecionado');
		if (!programSelectEl) {
			errorAndExit('Program select element not found.');
		}
		const programs: InsertProgram[] = await programSelectEl.$$eval(
			'option',
			(options) =>
				options.slice(1).map(({ value, text }) => ({
					code: value,
					name: text,
				})),
		);
		if (programs.length === 0) {
			errorAndExit('No programs found.');
		}

		const courses: InsertCourse[] = [];
		const programCourses: InsertProgramCourse[] = [];
		for (const { code, name } of programs) {
			const changeCourseBtn = await page.$('text=[alterar]');
			await changeCourseBtn?.click();
			await page.waitForSelector('#selecionado');
			await page.select('#selecionado', code);
			await page.waitForSelector('select[name="PL"]');
			const semesterSelectEl = await page.$('select[name="PL"]');
			if (!semesterSelectEl) {
				errorAndExit('Semester select element not found.');
			}
			const lastSemesterValue = await semesterSelectEl.$eval(
				'option',
				({ value }) => value,
			);
			await semesterSelectEl.select(lastSemesterValue);
			await page.waitForNavigation();
		}

		await browser.close();
	})
	.catch((error: unknown) => {
		console.error(error);
	});
