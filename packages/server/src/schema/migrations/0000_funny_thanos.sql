CREATE TABLE `assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_name` text NOT NULL,
	`asset_type` text DEFAULT 'image',
	`content_type` text,
	`asset_url` text,
	`asset_size` text,
	`duration` integer,
	`hls_url` text,
	`processing_status` text DEFAULT 'pending',
	`upload_id` text,
	`mediaconvert_job_id` text,
	`mediaconvert_job_status` text DEFAULT 'pending',
	`mediaconvert_job_progress` integer DEFAULT 0,
	`mediaconvert_job_current_phase` text,
	`upload_status` text DEFAULT 'pending',
	`user_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`phone` text,
	`dial_code` text,
	`email` text,
	`description` text,
	`logo_asset_id` integer,
	`user_id` integer NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()),
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`logo_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `emails` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`subject` text NOT NULL,
	`title` text NOT NULL,
	`subtitle` text NOT NULL,
	`body` text NOT NULL,
	`button_text` text NOT NULL,
	`button_link` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`checked` integer DEFAULT false,
	`starred` integer DEFAULT false,
	`flagged` integer DEFAULT false,
	`host_id` integer NOT NULL,
	`status` text DEFAULT 'draft',
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`host_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`notification_type` text NOT NULL,
	`is_read` integer DEFAULT false,
	`title` text,
	`message` text,
	`link` text,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `subscription` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`user_id` integer NOT NULL,
	`object` text NOT NULL,
	`amount_subtotal` integer NOT NULL,
	`amount_total` integer NOT NULL,
	`session_id` text NOT NULL,
	`cancel_url` text NOT NULL,
	`success_url` text NOT NULL,
	`created` integer NOT NULL,
	`currency` text NOT NULL,
	`mode` text NOT NULL,
	`payment_status` text NOT NULL,
	`status` text NOT NULL,
	`subscription_id` text
);
--> statement-breakpoint
CREATE TABLE `team_invitations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`inviter_id` integer NOT NULL,
	`invitee_email` text NOT NULL,
	`status` text DEFAULT 'pending',
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inviter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`role` text DEFAULT 'member',
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`dial_code` text DEFAULT '' NOT NULL,
	`password` text NOT NULL,
	`reset_token` text,
	`email_token` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	`role` text DEFAULT 'host',
	`profile_picture` text,
	`bio` text,
	`custom_id` text,
	`is_verified` integer DEFAULT false,
	`stripe_customer_id` text,
	`subscription_id` text,
	`subscription_product` text DEFAULT 'free',
	`subscription_status` text,
	`trial_ends_at` integer,
	`auth_provider` text DEFAULT 'local'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);