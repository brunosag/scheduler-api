import { writeFileSync } from 'fs';

export async function getRequirements(page) {
	await page.goto(
		'https://www1.ufrgs.br/PortalEnsino/GraduacaoCurriculos/plone.php?periodo=2024012&r=relatorio&curriculo=95&curso=305&habilitacao=36',
		{
			waitUntil: 'networkidle0',
		}
	);

	const semesters = [];

	const semesterBlockEls = await page.$$('.sem-quebra');
	for (const [index, block] of semesterBlockEls.entries()) {
		const blockName = await block.$eval('legend', (el) => el?.innerHTML);

		const semester = {};
		semester.number = blockName === 'Sem Etapa' ? null : index + 1;

		const courseEls = await block.$$('tr');
		semester.courses = [];
		for (const courseEl of courseEls) {
			let courseCode;
			try {
				courseCode = await courseEl.$eval('td', (el) => el.innerHTML);
			} catch (e) {
				courseCode = null;
			}
			if (courseCode) {
				semester.courses.push(courseCode);
			}
		}

		semesters.push(semester);
		if (!semester.number) {
			break;
		}
	}
	writeFileSync('out.json', JSON.stringify(semesters));
}
