import {
	integer,
	primaryKey,
	sqliteTable,
	text,
} from 'drizzle-orm/sqlite-core';

export const programsTable = sqliteTable('programs', {
	id: integer('id').notNull().unique(),
	name: text('name').notNull(),
});

export const coursesTable = sqliteTable('courses', {
	id: integer('id').notNull().unique(),
	code: text('code').notNull(),
	name: text('name').notNull(),
	credits: integer('credits').notNull(),
	teachingPlan: text('teaching_plan').notNull(),
	programId: integer('program_id')
		.notNull()
		.references(() => programsTable.id),
});

export const classesTable = sqliteTable('classes', {
	id: integer('id').notNull().unique(),
	name: text('name').notNull(),
	seniorSpots: integer('senior_spots').notNull(),
	juniorSpots: integer('junior_spots').notNull(),
	expandedSpots: integer('expanded_spots').notNull(),
	seniorFilledSpots: integer('senior_filled_spots').notNull(),
	juniorFilledSpots: integer('junior_filled_spots').notNull(),
	courseId: integer('course_id')
		.notNull()
		.references(() => coursesTable.id),
});

export const timeLocationTable = sqliteTable('time_location', {
	id: integer('id').notNull().unique(),
	day: integer('day').notNull(),
	startTime: integer('start_time').notNull(),
	endTime: integer('end_time').notNull(),
	locationName: text('location_name').notNull(),
	locationUrl: text('location_url'),
	classId: integer('class_id')
		.notNull()
		.references(() => classesTable.id),
});

export const professorsTable = sqliteTable('professors', {
	id: integer('id').notNull().unique(),
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
export type InsertTimeLocation = typeof timeLocationTable.$inferInsert;
export type InsertProfessor = typeof professorsTable.$inferInsert;
export type InsertProgramCourse = typeof programsCoursesTable.$inferInsert;
export type InsertClassProfessor = typeof classProfessorsTable.$inferInsert;

export type SelectProgram = typeof programsTable.$inferSelect;
export type SelectCourse = typeof coursesTable.$inferSelect;
export type SelectClass = typeof classesTable.$inferSelect;
export type SelectTimeLocation = typeof timeLocationTable.$inferSelect;
export type SelectProfessor = typeof professorsTable.$inferSelect;
export type SelectProgramCourse = typeof programsCoursesTable.$inferSelect;
export type SelectClassProfessor = typeof classProfessorsTable.$inferSelect;
