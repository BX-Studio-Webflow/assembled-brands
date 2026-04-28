import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

import { Business } from '../../schema';

// Step 1: Financial Overview
const financialOverviewSchema = z.object({
	revenue_last_12_months: z.string().min(1, 'Revenue for last 12 months is required'),
	net_income_last_12_months: z.string().min(1, 'Net income for last 12 months is required'),
	projected_revenue_next_12_months: z.string().min(1, 'Projected revenue for next 12 months is required'),
});

export const financialOverviewValidator = zValidator('json', financialOverviewSchema);
export type FinancialOverviewBody = z.infer<typeof financialOverviewSchema>;

// Document Upload
const documentUploadSchema = z.object({
	file_data: z.string().min(1, 'File data is required'),
	file_name: z.string().min(1, 'File name is required'),
	file_mime_type: z.string().min(1, 'File MIME type is required'),
	page: z.enum([
		'company-profile',
		'financial-overview',
		'financial-reports',
		'accounts-inventory',
		'ecommerce-performance',
		'team-ownership',
	]),
	document_type: z.enum([
		// Financial Reports (Step 2)
		'monthly_balance_sheet',
		'monthly_income_statement',
		'monthly_income_forecast',
		'monthly_balance_sheet_forecast',
		// Annual forecasts (warm-lead: next full year projections)
		'income_statement_forecast',
		'balance_sheet_full_year_forecast',
		// Accounts & Inventory (Step 3)
		'monthly_inventory_report',
		'accounts_receivable_aging',
		'accounts_payable_aging',
		// E-Commerce Performance (Step 4)
		'shopify_sales_over_time',
		'shopify_first_vs_returning_customers',
		// Legacy cold-lead aliases (backward compatible)
		'shopify_monthly_sales',
		'shopify_repeat_customers',
		// Team & Ownership (Step 5)
		'management_bios',
		'investor_deck',
		'cap_table',
		// Optional docs (stored under team folder)
		'instore_velocity_reports',
		'business_plan',
		// Other
		'other',
	]),
	asset_id: z.number().int().positive(),
	notes: z.string().optional(),
});

export const documentUploadValidator = zValidator('json', documentUploadSchema);
export type FinancialDocumentBody = z.infer<typeof documentUploadSchema>;

const updatePageSchema = z.object({
	page: z.enum([
		'company-profile',
		'financial-overview',
		'financial-reports',
		'accounts-inventory',
		'ecommerce-performance',
		'team-ownership',
	]),
});

export const updatePageValidator = zValidator('json', updatePageSchema);
export type UpdatePageBody = z.infer<typeof updatePageSchema>;

const updateStepSchema = z.object({
	step: z.number().int().min(1).max(3),
});

export const updateStepValidator = zValidator('json', updateStepSchema);
export type UpdateStepBody = z.infer<typeof updateStepSchema>;

// Progress Response Type
export type FinancialWizardProgressResponse = {
	current_page: string;
	is_complete: boolean;
	percentage: number;
	company_profile: Business | null; // Company profile is tracked separately via business service
	financial_overview: {
		revenue_last_12_months: string | null;
		net_income_last_12_months: string | null;
		projected_revenue_next_12_months: string | null;
	} | null;
	financial_reports: DocumentWithAsset[];
	accounts_inventory: DocumentWithAsset[];
	ecommerce_performance: DocumentWithAsset[];
	team_ownership: DocumentWithAsset[];
	business: Business | null;
};

export type DocumentWithAsset = {
	id: number;
	application_id: number;
	asset_id: number | null;
	page: string | null;
	document_type: string;
	is_current: boolean | null;
	version: number | null;
	notes: string | null;
	created_at: Date | null;
	updated_at: Date | null;
	asset_url: string | null;
	asset_name: string | null;
};
