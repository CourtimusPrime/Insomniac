CREATE TABLE `abilities_v2` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`version` text DEFAULT '1.0.0' NOT NULL,
	`author` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`executor` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`document` text,
	`file_path` text NOT NULL,
	`content_hash` text NOT NULL,
	`synced_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
