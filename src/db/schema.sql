CREATE TABLE
	programs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		code TEXT NOT NULL UNIQUE,
		name TEXT NOT NULL UNIQUE
	);

CREATE TABLE
	courses (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		code TEXT NOT NULL UNIQUE,
		name TEXT NOT NULL
	);

CREATE TABLE
	classes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		course_id INTEGER REFERENCES courses (id),
		name TEXT NOT NULL,
		freshman_spots INTEGER NOT NULL,
		senior_spots INTEGER NOT NULL
	);

CREATE TABLE
	time_blocks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		day TEXT NOT NULL,
		time TEXT NOT NULL
	);

CREATE TABLE
	professors (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE
	);

CREATE TABLE
	program_courses (
		program_id INTEGER REFERENCES programs (id),
		course_id INTEGER REFERENCES courses (id),
		PRIMARY KEY (program_id, course_id)
	);

CREATE TABLE
	class_time_blocks (
		class_id INTEGER REFERENCES classes (id),
		time_block_id INTEGER REFERENCES time_blocks (id),
		PRIMARY KEY (class_id, time_block_id)
	);

CREATE TABLE
	class_professors (
		class_id INTEGER REFERENCES classes (id),
		professor_id INTEGER REFERENCES professors (id),
		is_coordinator INTEGER NOT NULL DEFAULT 0,
		is_instructor INTEGER NOT NULL DEFAULT 1,
		is_grader INTEGER NOT NULL DEFAULT 1,
		PRIMARY KEY (class_id, professor_id)
	);