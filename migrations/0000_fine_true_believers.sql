CREATE TABLE `class_professors` (
	`class_id` integer NOT NULL,
	`professor_id` integer NOT NULL,
	`is_coordinator` integer DEFAULT false NOT NULL,
	`is_instructor` integer DEFAULT true NOT NULL,
	`is_grader` integer DEFAULT true NOT NULL,
	PRIMARY KEY (`class_id`, `professor_id`),
	FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`professor_id`) REFERENCES `professors` (`id`) ON UPDATE no action ON DELETE no action
);

--> statement-breakpoint
CREATE TABLE `class_time_blocks` (
	`class_id` integer NOT NULL,
	`time_block_id` integer NOT NULL,
	PRIMARY KEY (`class_id`, `time_block_id`),
	FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`time_block_id`) REFERENCES `time_blocks` (`id`) ON UPDATE no action ON DELETE no action
);

--> statement-breakpoint
CREATE TABLE `classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`freshman_spots` integer NOT NULL,
	`senior_spots` integer NOT NULL,
	`course_id` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON UPDATE no action ON DELETE no action
);

--> statement-breakpoint
CREATE TABLE `courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL
);

--> statement-breakpoint
CREATE TABLE `professors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);

--> statement-breakpoint
CREATE TABLE `programs_courses` (
	`program_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	PRIMARY KEY (`program_id`, `course_id`),
	FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON UPDATE no action ON DELETE no action
);

--> statement-breakpoint
CREATE TABLE `programs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL
);

--> statement-breakpoint
CREATE TABLE `time_blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day` text NOT NULL,
	`time` text NOT NULL
);

--> statement-breakpoint
CREATE UNIQUE INDEX `courses_code_unique` ON `courses` (`code`);

--> statement-breakpoint
CREATE UNIQUE INDEX `professors_name_unique` ON `professors` (`name`);

--> statement-breakpoint
CREATE UNIQUE INDEX `programs_code_unique` ON `programs` (`code`);
