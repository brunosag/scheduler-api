import { db } from './index.ts';
import {
	classesTable,
	classProfessorsTable,
	classTimeBlocksTable,
	coursesTable,
	professorsTable,
	programsCoursesTable,
	programsTable,
	timeBlocksTable,
} from './schema.ts';

export async function wipeDB() {
	await db.delete(programsTable);
	await db.delete(coursesTable);
	await db.delete(classesTable);
	await db.delete(timeBlocksTable);
	await db.delete(professorsTable);
	await db.delete(programsCoursesTable);
	await db.delete(classTimeBlocksTable);
	await db.delete(classProfessorsTable);
}
