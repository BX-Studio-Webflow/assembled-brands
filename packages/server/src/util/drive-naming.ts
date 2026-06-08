const DRIVE_FORBIDDEN_CHARS = /[/\\:*?"<>|]/g;

/** Human-readable names for Google Drive (preserves casing and spaces). */
export const sanitizeDriveDisplayName = (name: string): string =>
	name
		.trim()
		.replace(DRIVE_FORBIDDEN_CHARS, '-')
		.replace(/\s+/g, ' ')
		.replace(/-+/g, '-')
		.replace(/^[\s-]+|[\s-]+$/g, '');

const DOCUMENT_TYPE_DRIVE_LABELS: Record<string, string> = {
	monthly_balance_sheet: 'Monthly Balance Sheets',
	monthly_income_statement: 'Monthly Income Statements',
	monthly_income_forecast: 'Monthly Income Forecast',
	monthly_balance_sheet_forecast: 'Monthly Balance Sheet Forecast',
	income_statement_forecast: 'Forecasted Income Statement',
	balance_sheet_full_year_forecast: 'Forecasted Balance Sheet',
	monthly_inventory_report: 'Inventory Reports',
	accounts_receivable_aging: 'Accounts Receivable (A/R) Aging Reports',
	accounts_payable_aging: 'Accounts Payable (A/P) Aging Reports',
	shopify_sales_over_time: 'Shopify Monthly Sales Reports',
	shopify_first_vs_returning_customers: 'Shopify Repeat Customer Reports',
	shopify_monthly_sales: 'Shopify Monthly Sales Reports',
	shopify_repeat_customers: 'Shopify Repeat Customer Reports',
	management_bios: 'Management Bios',
	investor_deck: 'Investor Deck',
	cap_table: 'Capitalization Table',
	instore_velocity_reports: 'In-store velocity reports',
	business_plan: 'Business Plan',
};

export const getDocumentTypeDriveLabel = (documentType: string): string =>
	DOCUMENT_TYPE_DRIVE_LABELS[documentType] ??
	documentType
		.split('_')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');

/**
 * Parent applicant folder: "{Company Name} - {Deal Name}" when deal name differs from company.
 */
export const buildCompanyDriveFolderName = (companyName: string, dealName?: string | null): string => {
	const company = sanitizeDriveDisplayName(companyName);
	const deal = dealName ? sanitizeDriveDisplayName(dealName) : '';

	if (deal && deal.toLowerCase() !== company.toLowerCase()) {
		return sanitizeDriveDisplayName(`${companyName.trim()} - ${dealName!.trim()}`);
	}

	return company;
};

const getFileExtension = (fileName: string): string => {
	const match = fileName.match(/(\.[^.\\/:*?"<>|]+)$/);
	return match?.[1] ?? '';
};

/**
 * Uploaded file name: "{Company} - {Report Type}.{ext}"
 */
export const buildDriveUploadFileName = (companyName: string, documentType: string, originalFileName: string): string => {
	const company = sanitizeDriveDisplayName(companyName);
	const reportType = getDocumentTypeDriveLabel(documentType);
	const extension = getFileExtension(originalFileName);

	return sanitizeDriveDisplayName(`${company} - ${reportType}${extension}`);
};
