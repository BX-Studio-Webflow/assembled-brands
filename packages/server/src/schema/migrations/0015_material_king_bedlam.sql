CREATE TABLE `hubspot_contact_webhook_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app_id` integer NOT NULL,
	`event_id` integer NOT NULL,
	`subscription_id` integer NOT NULL,
	`portal_id` integer NOT NULL,
	`occurred_at` integer NOT NULL,
	`subscription_type` text NOT NULL,
	`attempt_number` integer NOT NULL,
	`object_id` integer NOT NULL,
	`change_source` text NOT NULL,
	`change_flag` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`user_id` integer,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hubspot_webhook_portal_event_subscription_unique` ON `hubspot_contact_webhook_events` (`portal_id`,`event_id`,`subscription_id`);