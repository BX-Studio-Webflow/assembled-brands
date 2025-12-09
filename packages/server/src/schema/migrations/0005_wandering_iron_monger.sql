PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`dial_code` text DEFAULT '' NOT NULL,
	`password` text NOT NULL,
	`reset_token` text,
	`email_token` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	`role` text DEFAULT 'user',
	`profile_picture` text,
	`bio` text,
	`custom_id` text,
	`is_verified` integer DEFAULT false,
	`stripe_customer_id` text,
	`subscription_id` text,
	`subscription_product` text DEFAULT 'free',
	`subscription_status` text,
	`trial_ends_at` integer,
	`auth_provider` text DEFAULT 'local',
	`first_name` text DEFAULT '' NOT NULL,
	`last_name` text DEFAULT '' NOT NULL,
	`loan_urgency` text DEFAULT 'none'
);
--> statement-breakpoint
INSERT INTO `__new_user`("id", "email", "phone", "dial_code", "password", "reset_token", "email_token", "created_at", "updated_at", "role", "profile_picture", "bio", "custom_id", "is_verified", "stripe_customer_id", "subscription_id", "subscription_product", "subscription_status", "trial_ends_at", "auth_provider", "first_name", "last_name", "loan_urgency") SELECT "id", "email", "phone", "dial_code", "password", "reset_token", "email_token", "created_at", "updated_at", "role", "profile_picture", "bio", "custom_id", "is_verified", "stripe_customer_id", "subscription_id", "subscription_product", "subscription_status", "trial_ends_at", "auth_provider", "first_name", "last_name", "loan_urgency" FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);