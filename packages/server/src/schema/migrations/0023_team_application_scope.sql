ALTER TABLE `teams` ADD `deal_application_id` integer;

UPDATE `teams`
SET `deal_application_id` = (
	SELECT `businesses`.`deal_application_id`
	FROM `team_members`
	INNER JOIN `businesses` ON `businesses`.`user_id` = `team_members`.`user_id`
	WHERE `team_members`.`team_id` = `teams`.`id`
		AND `team_members`.`role` = 'host'
		AND `businesses`.`deal_application_id` IS NOT NULL
	ORDER BY `businesses`.`updated_at` DESC
	LIMIT 1
)
WHERE `deal_application_id` IS NULL
	AND EXISTS (
		SELECT 1
		FROM `team_members`
		INNER JOIN `businesses` ON `businesses`.`user_id` = `team_members`.`user_id`
		WHERE `team_members`.`team_id` = `teams`.`id`
			AND `team_members`.`role` = 'host'
			AND `businesses`.`deal_application_id` IS NOT NULL
	);
