DROP INDEX IF EXISTS `day_time_unique`;

--> statement-breakpoint
CREATE UNIQUE INDEX `time_blocks_day_time_unique` ON `time_blocks` (`day`, `time`);
