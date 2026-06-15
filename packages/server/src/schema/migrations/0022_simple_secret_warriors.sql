CREATE TABLE IF NOT EXISTS `deal_applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`hubspot_deal_object_id` integer NOT NULL,
	`hubspot_deal_webhook_event_id` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`legal_name` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hubspot_deal_webhook_event_id`) REFERENCES `hubspot_deal_webhook_events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `deal_applications_hubspot_deal_object_id_unique` ON `deal_applications` (`hubspot_deal_object_id`);--> statement-breakpoint
CREATE TABLE `__financial_step_folders_backup` AS SELECT * FROM `financial_step_folders`;--> statement-breakpoint
DROP TABLE `financial_step_folders`;--> statement-breakpoint
CREATE TABLE `__new_businesses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`legal_name` text NOT NULL,
	`headquarters` text,
	`inventory_location` text,
	`international_location` text,
	`raised_external_equity` text,
	`year_formed` text,
	`accounting_software` text,
	`other_accounting_software` text,
	`description` text,
	`folder_id` text DEFAULT '' NOT NULL,
	`user_id` integer NOT NULL,
	`deal_application_id` integer,
	`updated_at` integer DEFAULT (unixepoch()),
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_businesses`("id", "legal_name", "headquarters", "inventory_location", "international_location", "raised_external_equity", "year_formed", "accounting_software", "other_accounting_software", "description", "folder_id", "user_id", "deal_application_id", "updated_at", "created_at") SELECT "id", "legal_name", "headquarters", "inventory_location", "international_location", "raised_external_equity", "year_formed", "accounting_software", "other_accounting_software", "description", "folder_id", "user_id", NULL, "updated_at", "created_at" FROM `businesses`;--> statement-breakpoint
DROP TABLE `businesses`;--> statement-breakpoint
ALTER TABLE `__new_businesses` RENAME TO `businesses`;--> statement-breakpoint
CREATE TABLE `financial_step_folders` (
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
INSERT INTO `financial_step_folders`("id", "business_id", "user_id", "page", "folder_id", "created_at", "updated_at") SELECT "id", "business_id", "user_id", "page", "folder_id", "created_at", "updated_at" FROM `__financial_step_folders_backup`;--> statement-breakpoint
DROP TABLE `__financial_step_folders_backup`;--> statement-breakpoint
ALTER TABLE `financial_wizard_applications` ADD `deal_application_id` integer;--> statement-breakpoint
ALTER TABLE `hubspot_deal_webhook_events` ADD `deal_application_id` integer;--> statement-breakpoint
ALTER TABLE `onboarding_applications` ADD `deal_application_id` integer;--> statement-breakpoint
INSERT INTO `deal_applications` (`user_id`, `hubspot_deal_object_id`, `hubspot_deal_webhook_event_id`, `status`, `legal_name`, `created_at`, `updated_at`)
SELECT
	h.`user_id`,
	h.`object_id`,
	h.`id`,
	CASE
		WHEN h.`id` = (
			SELECT h2.`id`
			FROM `hubspot_deal_webhook_events` h2
			WHERE h2.`user_id` = h.`user_id`
				AND h2.`status` = 'processed'
			ORDER BY h2.`created_at` DESC
			LIMIT 1
		) THEN 'active'
		ELSE 'superseded'
	END,
	h.`deal_name`,
	h.`created_at`,
	h.`updated_at`
FROM `hubspot_deal_webhook_events` h
WHERE h.`status` = 'processed'
	AND h.`user_id` IS NOT NULL
	AND EXISTS (SELECT 1 FROM `user` u WHERE u.`id` = h.`user_id`)
	AND h.`id` = (
		SELECT h2.`id`
		FROM `hubspot_deal_webhook_events` h2
		WHERE h2.`object_id` = h.`object_id`
			AND h2.`status` = 'processed'
		ORDER BY h2.`created_at` DESC
		LIMIT 1
	);--> statement-breakpoint
UPDATE `hubspot_deal_webhook_events`
SET `deal_application_id` = (
	SELECT da.`id`
	FROM `deal_applications` da
	WHERE da.`hubspot_deal_object_id` = `hubspot_deal_webhook_events`.`object_id`
)
WHERE `status` = 'processed';--> statement-breakpoint
UPDATE `onboarding_applications`
SET `deal_application_id` = (
	SELECT da.`id`
	FROM `deal_applications` da
	WHERE da.`user_id` = `onboarding_applications`.`user_id`
	ORDER BY da.`created_at` DESC
	LIMIT 1
)
WHERE `deal_application_id` IS NULL;--> statement-breakpoint
UPDATE `financial_wizard_applications`
SET `deal_application_id` = (
	SELECT da.`id`
	FROM `deal_applications` da
	WHERE da.`user_id` = `financial_wizard_applications`.`user_id`
	ORDER BY da.`created_at` DESC
	LIMIT 1
)
WHERE `deal_application_id` IS NULL;--> statement-breakpoint
UPDATE `businesses`
SET `deal_application_id` = (
	SELECT da.`id`
	FROM `deal_applications` da
	WHERE da.`user_id` = `businesses`.`user_id`
	ORDER BY da.`created_at` DESC
	LIMIT 1
)
WHERE `deal_application_id` IS NULL;
