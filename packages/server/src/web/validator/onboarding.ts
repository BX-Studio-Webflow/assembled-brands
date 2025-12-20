import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

// Step 1: Company Info
const onboardingStep1Schema = z.object({
	legal_name: z.string().min(1, 'Legal name is required'),
	employee_count: z.enum(['just_me', '2-10', '11-50', '51-100', '101-500', '501+']),
	website: z.string().url('Invalid website URL').optional().or(z.literal('')),
});

export const onboardingStep1Validator = zValidator('json', onboardingStep1Schema);
export type OnboardingStep1Body = z.infer<typeof onboardingStep1Schema>;

// Step 2: Business Details
const onboardingStep2Schema = z.object({
	years_in_business: z.string().min(1, 'Years in business is required'),
	asset_type: z.enum(['inventory', 'accounts_receivable', 'purchase_orders', 'not_sure']),
	desired_loan_amount: z.string().min(1, 'Desired loan amount is required'),
});

export const onboardingStep2Validator = zValidator('json', onboardingStep2Schema);
export type OnboardingStep2Body = z.infer<typeof onboardingStep2Schema>;

// Step 3: Qualification
const onboardingStep3Schema = z
	.object({
		company_type: z.enum(['cpg', 'saas', 'consulting', 'distributor_wholesaler', 'other']),
		company_type_other: z.string().optional(),
		revenue_qualification: z.enum(['yes', 'no']),
	})
	.refine(
		(data) => {
			// If company_type is 'other', company_type_other must be provided
			if (data.company_type === 'other') {
				return data.company_type_other && data.company_type_other.length > 0;
			}
			return true;
		},
		{
			message: 'Please specify the company type',
			path: ['company_type_other'],
		},
	);

export const onboardingStep3Validator = zValidator('json', onboardingStep3Schema);
export type OnboardingStep3Body = z.infer<typeof onboardingStep3Schema>;

// Progress Response Type
export type OnboardingProgressResponse = {
	current_step: number;
	is_complete: boolean;
	is_qualified: boolean;
	is_rejected: boolean;
	rejection_reason: string | null;
	percentage: number;
	step1: {
		legal_name: string | null;
		employee_count: string | null;
		website: string | null;
	};
	step2: {
		years_in_business: string | null;
		asset_type: string | null;
		desired_loan_amount: string | null;
	};
	step3: {
		company_type: string | null;
		company_type_other: string | null;
		revenue_qualification: string | null;
	};
};
