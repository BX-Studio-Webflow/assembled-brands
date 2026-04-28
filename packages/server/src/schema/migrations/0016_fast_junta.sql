CREATE TABLE `hubspot_deal_webhook_events` (
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
	`deal_name` text,
	`amount` text,
	`deal_stage` text,
	`pipeline` text,
	`close_date` text,
	`hubspot_owner_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hubspot_deal_webhook_portal_event_subscription_unique` ON `hubspot_deal_webhook_events` (`portal_id`,`event_id`,`subscription_id`);