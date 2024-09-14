import {
	integer,
	primaryKey,
	sqliteTable,
	text,
	unique,
} from 'drizzle-orm/sqlite-core';

export const programsTable = sqliteTable('programs', {
	id: integer('id').notNull().unique(),
	code: text('code').notNull().unique(),
	name: text('name').notNull(),
});

export const coursesTable = sqliteTable('courses', {
	id: integer('id').notNull().unique(),
	code: text('code').notNull().unique(),
	name: text('name').notNull(),
	programId: integer('program_id')
		.notNull()
		.references(() => programsTable.id),
});

export const classesTable = sqliteTable('classes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	spots: integer('spots').notNull(),
	courseId: integer('course_id')
		.notNull()
		.references(() => coursesTable.id),
});

export const timeBlocksTable = sqliteTable(
	'time_blocks',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		day: text('day').notNull(),
		time: text('time').notNull(),
	},
	(table) => ({
		unq: unique().on(table.day, table.time),
	}),
);

export const professorsTable = sqliteTable('professors', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
});

export const programsCoursesTable = sqliteTable(
	'programs_courses',
	{
		programId: integer('program_id')
			.notNull()
			.references(() => programsTable.id),
		courseId: integer('course_id')
			.notNull()
			.references(() => coursesTable.id),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.programId, table.courseId] }),
	}),
);

export const classTimeBlocksTable = sqliteTable(
	'class_time_blocks',
	{
		classId: integer('class_id')
			.notNull()
			.references(() => classesTable.id),
		timeBlockId: integer('time_block_id')
			.notNull()
			.references(() => timeBlocksTable.id),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.classId, table.timeBlockId] }),
	}),
);

export const classProfessorsTable = sqliteTable(
	'class_professors',
	{
		classId: integer('class_id')
			.notNull()
			.references(() => classesTable.id),
		professorId: integer('professor_id')
			.notNull()
			.references(() => professorsTable.id),
		isCoordinator: integer('is_coordinator', { mode: 'boolean' }).notNull(),
		isInstructor: integer('is_instructor', { mode: 'boolean' }).notNull(),
		isGrader: integer('is_grader', { mode: 'boolean' }).notNull(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.classId, table.professorId] }),
	}),
);

export type InsertProgram = typeof programsTable.$inferInsert;
export type InsertCourse = typeof coursesTable.$inferInsert;
export type InsertClass = typeof classesTable.$inferInsert;
export type InsertTimeBlock = typeof timeBlocksTable.$inferInsert;
export type InsertProfessor = typeof professorsTable.$inferInsert;
export type InsertProgramCourse = typeof programsCoursesTable.$inferInsert;
export type InsertClassTimeBlock = typeof classTimeBlocksTable.$inferInsert;
export type InsertClassProfessor = typeof classProfessorsTable.$inferInsert;

export type SelectProgram = typeof programsTable.$inferSelect;
export type SelectCourse = typeof coursesTable.$inferSelect;
export type SelectClass = typeof classesTable.$inferSelect;
export type SelectTimeBlock = typeof timeBlocksTable.$inferSelect;
export type SelectProfessor = typeof professorsTable.$inferSelect;
export type SelectProgramCourse = typeof programsCoursesTable.$inferSelect;
export type SelectClassTimeBlock = typeof classTimeBlocksTable.$inferSelect;
export type SelectClassProfessor = typeof classProfessorsTable.$inferSelect;
