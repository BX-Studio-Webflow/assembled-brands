CREATE TABLE `financial_step_folders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`business_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`page` text NOT NULL,
	`folder_id` text NOT NULL  DEFAULT '',
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`application_id`) REFERENCES `financial_wizard_applications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `businesses` ADD `folder_id` text NOT NULL DEFAULT '';