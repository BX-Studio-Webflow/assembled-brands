PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_financial_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`asset_id` integer NOT NULL,
	`page` text NOT NULL,
	`document_type` text NOT NULL,
	`is_current` integer DEFAULT true,
	`version` integer DEFAULT 1,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`application_id`) REFERENCES `financial_wizard_applications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_financial_documents`("id", "application_id", "asset_id", "page", "document_type", "is_current", "version", "notes", "created_at", "updated_at") SELECT "id", "application_id", "asset_id", "page", "document_type", "is_current", "version", "notes", "created_at", "updated_at" FROM `financial_documents`;--> statement-breakpoint
DROP TABLE `financial_documents`;--> statement-breakpoint
ALTER TABLE `__new_financial_documents` RENAME TO `financial_documents`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_financial_wizard_applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`current_page` text DEFAULT 'financial-overview',
	`is_complete` integer DEFAULT false,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_financial_wizard_applications`("id", "user_id", "current_page", "is_complete", "created_at", "updated_at") SELECT "id", "user_id", "current_page", "is_complete", "created_at", "updated_at" FROM `financial_wizard_applications`;--> statement-breakpoint
DROP TABLE `financial_wizard_applications`;--> statement-breakpoint
ALTER TABLE `__new_financial_wizard_applications` RENAME TO `financial_wizard_applications`;--> statement-breakpoint
CREATE TABLE `__new_team_invitations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`inviter_id` integer NOT NULL,
	`invitee_email` text NOT NULL,
	`invitee_name` text NOT NULL,
	`user_defined_role` text DEFAULT '' NOT NULL,
	`message` text DEFAULT '',
	`status` text DEFAULT 'pending',
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inviter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_team_invitations`("id", "team_id", "inviter_id", "invitee_email", "invitee_name", "user_defined_role", "message", "status", "created_at", "updated_at") SELECT "id", "team_id", "inviter_id", "invitee_email", "invitee_name", "user_defined_role", "message", "status", "created_at", "updated_at" FROM `team_invitations`;--> statement-breakpoint
DROP TABLE `team_invitations`;--> statement-breakpoint
ALTER TABLE `__new_team_invitations` RENAME TO `team_invitations`;