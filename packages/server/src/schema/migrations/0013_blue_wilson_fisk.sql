PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_businesses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`legal_name` text NOT NULL,
	`headquarters` text,
	`year_formed` text,
	`accounting_software` text,
	`other_accounting_software` text,
	`description` text,
	`folder_id` text DEFAULT '' NOT NULL,
	`logo_asset_id` integer,
	`user_id` integer NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()),
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`logo_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_businesses`("id", "legal_name", "headquarters", "year_formed", "accounting_software", "other_accounting_software", "description", "folder_id", "logo_asset_id", "user_id", "updated_at", "created_at") SELECT "id", "legal_name", "headquarters", "year_formed", "accounting_software", "other_accounting_software", "description", "folder_id", "logo_asset_id", "user_id", "updated_at", "created_at" FROM `businesses`;--> statement-breakpoint
DROP TABLE `businesses`;--> statement-breakpoint
ALTER TABLE `__new_businesses` RENAME TO `businesses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_financial_step_folders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`business_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`page` text NOT NULL,
	`folder_id` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`application_id`) REFERENCES `financial_wizard_applications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_financial_step_folders`("id", "application_id", "business_id", "user_id", "page", "folder_id", "created_at", "updated_at") SELECT "id", "application_id", "business_id", "user_id", "page", "folder_id", "created_at", "updated_at" FROM `financial_step_folders`;--> statement-breakpoint
DROP TABLE `financial_step_folders`;--> statement-breakpoint
ALTER TABLE `__new_financial_step_folders` RENAME TO `financial_step_folders`;