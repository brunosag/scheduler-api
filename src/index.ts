import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import {
	InsertClass,
	InsertClassProfessor,
	InsertClassTimeBlock,
	InsertCourse,
	InsertProfessor,
	InsertProgram,
	InsertProgramCourse,
	InsertTimeBlock,
} from './db/schema';
import { errorAndExit, getEnv } from './utils';

const PORTAL_URL =
	'https://www1.ufrgs.br/sistemas/portal/login?Destino=ccd7f388f9a3e25ef6aff3b98c773f65';
const ENROLLMENT_PORTAL_URL =
	'https://www1.ufrgs.br/sistemas/portal/login?Destino=portal-matricula';
const PORTAL_CLASSES_URL =
	'https://www1.ufrgs.br/intranet/portal/public/index.php?cods=1,1,1,224';
const ENROLLMENT_PORTAL_CLASSES_URL =
	'https://www1.ufrgs.br/especial/index.php?cods=1,1,2,7';

const classes: InsertClass[] = [];
const timeBlocks: InsertTimeBlock[] = [];
const professors: InsertProfessor[] = [];
const programCourses: InsertProgramCourse[] = [];
const classTimeBlocks: InsertClassTimeBlock[] = [];
const classProfessors: InsertClassProfessor[] = [];

async function login(page: Page) {
	await page.type('#usuario', getEnv('PORTAL_USER'));
	await page.type('#senha', getEnv('PORTAL_PASSWORD'));
	await page.click('input[name="login"]');
	await page.waitForNetworkIdle();
}

puppeteer.use(StealthPlugin());

puppeteer
	.launch({ headless: false })
	.then(async (browser) => {
		const page = await browser.newPage();
		await page.goto(PORTAL_URL);
		await login(page);
		await page.goto(PORTAL_CLASSES_URL);
		const isEnrollmentPeriod = await page.$('.fieldAlerta');
		if (isEnrollmentPeriod) {
			await page.goto(ENROLLMENT_PORTAL_URL);
			await login(page);
			await page.goto(ENROLLMENT_PORTAL_CLASSES_URL);
		}
		const programSelectEl = await page.$('#selecionado');
		if (!programSelectEl) {
			errorAndExit('Program select element not found.');
		}
		const programs: InsertProgram[] = await programSelectEl.$$eval(
			'option',
			(options) =>
				options.slice(1).map(({ value, text }, index) => ({
					id: index,
					code: value,
					name: text,
				})),
		);
		if (programs.length === 0) {
			errorAndExit('No programs found.');
		}
		const courses: InsertCourse[] = [];
		for (const { id, code } of programs) {
			const changeCourseBtn = await page.$('text=[alterar]');
			await changeCourseBtn?.click();
			await page.waitForSelector('#selecionado');
			await page.select('#selecionado', code);
			await page.waitForNetworkIdle();
			const tableEl = await page.$('#Horarios');
			if (!tableEl) continue;
			const rows = (await tableEl.$$('tr')).slice(1);
			for (const row of rows) {
				const cells = await row.$$('td');
				const nameString = await cells[0].evaluate((cell) =>
					cell.innerText.trim(),
				);
				const code = nameString.slice(1, nameString.indexOf(')'));
				const name = nameString.slice(nameString.indexOf(' ') + 1);
				if (!courses.some((course) => course.code === code)) {
					courses.push({ id: courses.length, code, name, programId: id });
				}
			}
		}
		await browser.close();
	})
	.catch((error: unknown) => {
		console.error(error);
	});
