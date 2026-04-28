ALTER TABLE `onboarding_applications` ADD `incorporation_state` text;--> statement-breakpoint
ALTER TABLE `onboarding_applications` ADD `net_revenue_last_12_months` text;--> statement-breakpoint
ALTER TABLE `onboarding_applications` ADD `working_with_team_member` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `onboarding_applications` ADD `team_member_slug` text;