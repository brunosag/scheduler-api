import {
	integer,
	primaryKey,
	sqliteTable,
	text,
} from 'drizzle-orm/sqlite-core';

export const programs = sqliteTable('programs', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	code: text('code').notNull(),
});

export const courses = sqliteTable('courses', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	code: text('code').notNull().unique(),
	name: text('name').notNull(),
});

export const classes = sqliteTable('classes', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	freshmanSpots: integer('freshman_spots').notNull(),
	seniorSpots: integer('senior_spots').notNull(),
	courseId: integer('course_id').references(() => courses.id),
});

export const timeBlocks = sqliteTable('time_blocks', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	day: text('day').notNull(),
	time: text('time').notNull(),
});

export const professors = sqliteTable('professors', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
});

export const programsCourses = sqliteTable(
	'programs_courses',
	{
		programId: integer('program_id').references(() => programs.id),
		courseId: integer('course_id').references(() => courses.id),
	},
	(table) => {
		return {
			pk: primaryKey({ columns: [table.programId, table.courseId] }),
		};
	},
);

export const classTimeBlocks = sqliteTable(
	'class_time_blocks',
	{
		classId: integer('class_id').references(() => classes.id),
		timeBlockId: integer('time_block_id').references(() => timeBlocks.id),
	},
	(table) => {
		return {
			pk: primaryKey({ columns: [table.classId, table.timeBlockId] }),
		};
	},
);

export const classProfessors = sqliteTable(
	'class_professors',
	{
		isCoordinator: integer('is_coordinator', { mode: 'boolean' })
			.notNull()
			.default(false),
		isInstructor: integer('is_instructor', { mode: 'boolean' })
			.notNull()
			.default(true),
		isGrader: integer('is_grader', { mode: 'boolean' }).notNull().default(true),
		classId: integer('class_id').references(() => classes.id),
		professorId: integer('professor_id').references(() => professors.id),
	},
	(table) => {
		return {
			pk: primaryKey({ columns: [table.classId, table.professorId] }),
		};
	},
);
