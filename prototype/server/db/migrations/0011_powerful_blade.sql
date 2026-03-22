CREATE TABLE `log_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`level` text DEFAULT 'info' NOT NULL,
	`message` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
