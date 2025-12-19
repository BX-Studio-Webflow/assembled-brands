ALTER TABLE `businesses` RENAME COLUMN "name" TO "legal_name";--> statement-breakpoint
ALTER TABLE `businesses` RENAME COLUMN "address" TO "headquarters";--> statement-breakpoint
ALTER TABLE `businesses` ADD `year_formed` text;--> statement-breakpoint
ALTER TABLE `businesses` ADD `accounting_software` text;--> statement-breakpoint
ALTER TABLE `businesses` ADD `other_accounting_software` text;--> statement-breakpoint
ALTER TABLE `businesses` DROP COLUMN `phone`;--> statement-breakpoint
ALTER TABLE `businesses` DROP COLUMN `dial_code`;--> statement-breakpoint
ALTER TABLE `businesses` DROP COLUMN `email`;