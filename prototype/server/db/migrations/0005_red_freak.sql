CREATE TABLE `stage_abilities` (
	`stage_id` text NOT NULL,
	`ability_id` text NOT NULL,
	`assigned_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`stage_id`, `ability_id`),
	FOREIGN KEY (`stage_id`) REFERENCES `pipeline_stages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ability_id`) REFERENCES `abilities`(`id`) ON UPDATE no action ON DELETE no action
);
