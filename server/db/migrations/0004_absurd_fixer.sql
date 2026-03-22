CREATE TABLE `project_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`default_model` text,
	`task_type_overrides` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action
);
