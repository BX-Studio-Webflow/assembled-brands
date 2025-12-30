PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_financial_step_folders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`page` text NOT NULL,
	`folder_id` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_financial_step_folders`("id", "business_id", "user_id", "page", "folder_id", "created_at", "updated_at") SELECT "id", "business_id", "user_id", "page", "folder_id", "created_at", "updated_at" FROM `financial_step_folders`;--> statement-breakpoint
DROP TABLE `financial_step_folders`;--> statement-breakpoint
ALTER TABLE `__new_financial_step_folders` RENAME TO `financial_step_folders`;--> statement-breakpoint
PRAGMA foreign_keys=ON;