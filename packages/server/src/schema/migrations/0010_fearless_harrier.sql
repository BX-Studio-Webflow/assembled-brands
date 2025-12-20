-- Update default value for current_page column
-- Since SQLite doesn't support ALTER COLUMN DEFAULT directly, we use a simpler approach:
-- Just update any NULL values to the new default, and the schema default will apply to new rows
UPDATE `financial_wizard_applications` 
SET `current_page` = 'company-profile' 
WHERE `current_page` IS NULL OR `current_page` = '';