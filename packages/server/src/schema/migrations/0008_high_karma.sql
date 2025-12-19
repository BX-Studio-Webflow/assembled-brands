PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_team_invitations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`inviter_id` integer NOT NULL,
	`invitee_email` text NOT NULL,
	`invitee_name` text NOT NULL,
	`user_defined_role` text DEFAULT '' NOT NULL,
	`message` text,
	`status` text DEFAULT 'pending',
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inviter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_team_invitations`("id", "team_id", "inviter_id", "invitee_email", "invitee_name", "user_defined_role", "message", "status", "created_at", "updated_at") SELECT "id", "team_id", "inviter_id", "invitee_email", "invitee_name", "user_defined_role", "message", "status", "created_at", "updated_at" FROM `team_invitations`;--> statement-breakpoint
DROP TABLE `team_invitations`;--> statement-breakpoint
ALTER TABLE `__new_team_invitations` RENAME TO `team_invitations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;