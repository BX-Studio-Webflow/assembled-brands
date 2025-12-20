-- Add current_page column to financial_wizard_applications
ALTER TABLE `financial_wizard_applications` ADD COLUMN `current_page` text DEFAULT 'company-profile';

-- Migrate existing current_step values to current_page
UPDATE `financial_wizard_applications` 
SET `current_page` = CASE 
  WHEN `current_step` = 1 THEN 'financial-overview'
  WHEN `current_step` = 2 THEN 'financial-reports'
  WHEN `current_step` = 3 THEN 'accounts-inventory'
  WHEN `current_step` = 4 THEN 'ecommerce-performance'
  WHEN `current_step` = 5 THEN 'team-ownership'
  ELSE 'financial-overview'
END
WHERE `current_page` IS NULL OR `current_page` = 'financial-overview';

-- Add page column to financial_documents
ALTER TABLE `financial_documents` ADD COLUMN `page` text;

-- Migrate existing step values to page in financial_documents
UPDATE `financial_documents`
SET `page` = CASE
  WHEN `step` = 1 THEN 'financial-overview'
  WHEN `step` = 2 THEN 'financial-reports'
  WHEN `step` = 3 THEN 'accounts-inventory'
  WHEN `step` = 4 THEN 'ecommerce-performance'
  WHEN `step` = 5 THEN 'team-ownership'
  ELSE NULL
END
WHERE `page` IS NULL;

-- Set default for new records
UPDATE `financial_documents` SET `page` = 'financial-reports' WHERE `page` IS NULL;

