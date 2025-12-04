import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

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
	step: z.number().int().min(2).max(5),
	document_type: z.enum([
		// Financial Reports (Step 2)
		'monthly_balance_sheet',
		'monthly_income_statement',
		'monthly_income_forecast',
		// Accounts & Inventory (Step 3)
		'monthly_inventory_report',
		'accounts_receivable_aging',
		'accounts_payable_aging',
		// E-Commerce Performance (Step 4)
		'shopify_repeat_customers',
		'shopify_monthly_sales',
		// Team & Ownership (Step 5)
		'management_bios',
		'investor_deck',
		'cap_table',
		// Other
		'other',
	]),
	asset_id: z.number().int().positive(),
	notes: z.string().optional(),
});

export const documentUploadValidator = zValidator('json', documentUploadSchema);
export type FinancialDocumentBody = z.infer<typeof documentUploadSchema>;

// Update Step
const updateStepSchema = z.object({
	step: z.number().int().min(1).max(5),
});

export const updateStepValidator = zValidator('json', updateStepSchema);
export type UpdateStepBody = z.infer<typeof updateStepSchema>;

// Progress Response Type
export type FinancialWizardProgressResponse = {
	current_step: number;
	is_complete: boolean;
	step1: {
		revenue_last_12_months: string | null;
		net_income_last_12_months: string | null;
		projected_revenue_next_12_months: string | null;
	} | null;
	step2: Array<{
		id: number;
		application_id: number;
		asset_id: number;
		step: number;
		document_type: string;
		is_current: boolean;
		version: number;
		notes: string | null;
		created_at: Date | null;
		updated_at: Date | null;
		asset_url: string | null;
		asset_name: string | null;
	}>;
	step3: Array<{
		id: number;
		application_id: number;
		asset_id: number;
		step: number;
		document_type: string;
		is_current: boolean;
		version: number;
		notes: string | null;
		created_at: Date | null;
		updated_at: Date | null;
		asset_url: string | null;
		asset_name: string | null;
	}>;
	step4: Array<{
		id: number;
		application_id: number;
		asset_id: number;
		step: number;
		document_type: string;
		is_current: boolean;
		version: number;
		notes: string | null;
		created_at: Date | null;
		updated_at: Date | null;
		asset_url: string | null;
		asset_name: string | null;
	}>;
	step5: Array<{
		id: number;
		application_id: number;
		asset_id: number;
		step: number;
		document_type: string;
		is_current: boolean;
		version: number;
		notes: string | null;
		created_at: Date | null;
		updated_at: Date | null;
		asset_url: string | null;
		asset_name: string | null;
	}>;
};

