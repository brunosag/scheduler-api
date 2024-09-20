import { Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import {
	InsertClass,
	InsertCourse,
	InsertProgram,
	InsertTimeLocation,
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
		const programOptions = await programSelectEl.$$eval('option', (options) =>
			options.slice(1).map(({ value }) => value),
		);
		const programs: InsertProgram[] = [];
		const courses: InsertCourse[] = [];
		const classes: InsertClass[] = [];
		const timeLocations: InsertTimeLocation[] = [];
		for (const option of programOptions) {
			const changeCourseBtn = await page.$('text=[alterar]');
			await changeCourseBtn?.click();
			await page.waitForSelector('#selecionado');
			await page.select('#selecionado', option);
			await page.waitForNetworkIdle();
			const tableEl = await page.$('#Horarios');
			if (tableEl) {
				const programId = programs.length;
				const name = await page.$eval('#principal b', (el) => el.innerText);
				programs.push({ id: programId, name });
				const rows = (await tableEl.$$('tr')).slice(1);
				for (const row of rows) {
					const cells = await row.$$('td');
					const nameString = await cells[0].evaluate((cell) =>
						cell.innerText.trim(),
					);
					if (nameString !== '') {
						const courseId = courses.length;
						const code = nameString.slice(1, nameString.indexOf(')'));
						const name = nameString.slice(nameString.indexOf(' ') + 1);
						const credits = await cells[1].evaluate((cell) =>
							parseInt(cell.innerText),
						);
						const teachingPlan = await cells[10].$eval('a', (el) => el.href);
						courses.push({
							id: courseId,
							code,
							name,
							credits,
							teachingPlan,
							programId,
						});
					}
					const classId = classes.length;
					const name = await cells[2].evaluate((cell) => cell.innerText);
					const seniorSpots = await cells[3].evaluate((cell) =>
						parseInt(cell.innerText),
					);
					const juniorSpots = await cells[4].evaluate((cell) =>
						parseInt(cell.innerText),
					);
					const expandedSpots = await cells[5].evaluate((cell) =>
						parseInt(cell.innerText),
					);
					const seniorFilledSpots = await cells[6].evaluate((cell) =>
						parseInt(cell.innerText),
					);
					const juniorFilledSpots = await cells[7].evaluate((cell) =>
						parseInt(cell.innerText),
					);
					const courseId = courses.length - 1;
					classes.push({
						id: classId,
						name,
						seniorSpots,
						juniorSpots,
						expandedSpots,
						seniorFilledSpots,
						juniorFilledSpots,
						courseId,
					});
					const timeLocationEl = await cells[8].$('ul');
					console.log(await timeLocationEl?.evaluate((el) => el.childNodes));
					const dayCount = timeLocationEls.length / 2;
					for (let i = 0; i < dayCount; i++) {
						const timeLocationId = timeLocations.length;
						console.log(timeLocationEls[i].textContent);
						const day = timeLocationEls[i].textContent?.split(' ')[0];
						console.log(day);
					}
				}
			}
		}
		await browser.close();
	})
	.catch((error: unknown) => {
		console.error(error);
	});
