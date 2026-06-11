import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const businessSchema = z
	.object({
		legal_name: z.string().min(1),
		headquarters: z.string().optional(),
		inventory_location: z.enum(['US-CA', 'International']).optional(),
		international_location: z.string().optional(),
		raised_external_equity: z.enum(['yes', 'no']).optional(),
		year_formed: z.string().optional(),
		accounting_software: z.enum(['quickbooks', 'quickbooks-online', 'netsuite', 'other', 'acumatica']),
		other_accounting_software: z.string().optional(),
		description: z.string().optional(),
		banner: z.string().optional(),
		user_id: z.number().optional(),
	})
	.superRefine((data, ctx) => {
		if (data.inventory_location === 'International' && !data.international_location?.trim()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'City and country are required for international inventory locations',
				path: ['international_location'],
			});
		}
	});

export const businessValidator = zValidator('json', businessSchema);
const businessQuerySchema = z.object({
	page: z.coerce.number().optional().default(1),
	limit: z.coerce.number().optional().default(10),
	search: z.string().optional(),
});

export const businessQueryValidator = zValidator('query', businessQuerySchema);
export type BusinessQuery = z.infer<typeof businessQuerySchema>;
export type BusinessBody = z.infer<typeof businessSchema>;
