import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

// Step 1: Company Info
const onboardingStep1Schema = z.object({
	legal_name: z.string().min(1, 'Legal name is required'),
	employee_count: z.enum(['just_me', '2-10', '11-50', '51-100', '101-500', '501+']),
	website: z.string().optional().or(z.literal('')),
});

export const onboardingStep1Validator = zValidator('json', onboardingStep1Schema);
export type OnboardingStep1Body = z.infer<typeof onboardingStep1Schema>;

// Step 2: Business Details
const onboardingStep2Schema = z.object({
	years_in_business: z.string().min(1, 'Years in business is required'),
	asset_type: z.enum(['inventory', 'accounts_receivable', 'purchase_orders', 'not_sure']),
	desired_loan_amount: z.enum(['1-5', '5-10', '10-25', '25+']),
});

export const onboardingStep2Validator = zValidator('json', onboardingStep2Schema);
export type OnboardingStep2Body = z.infer<typeof onboardingStep2Schema>;

// Step 3: Qualification
const onboardingStep3Schema = z
	.object({
		company_type: z.enum(['cpg', 'distributor_wholesaler', 'service_provider', 'other']),
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

// Warm Lead: unauthenticated single-step submission
const warmLeadDetailsSchema = z
	.object({
		deal_id: z.number({ message: 'deal_id is required' }).int().positive(),
		legal_name: z.string().min(1, 'Legal name is required'),
		incorporation_state: z.string().length(2, 'State must be a 2-letter US state code'),
		net_revenue_last_12_months: z.string().min(1, 'Revenue is required'),
		working_with_team_member: z.boolean(),
		team_member_email: z.email('team_member_email must be a valid email').optional(),
	})
	.refine(
		(data) => {
			if (data.working_with_team_member) {
				return !!data.team_member_email && data.team_member_email.length > 0;
			}
			return true;
		},
		{
			message: 'team_member_email is required when working_with_team_member is true',
			path: ['team_member_email'],
		},
	);

export const warmLeadDetailsValidator = zValidator('json', warmLeadDetailsSchema);
export type WarmLeadDetailsBody = z.infer<typeof warmLeadDetailsSchema>;

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
