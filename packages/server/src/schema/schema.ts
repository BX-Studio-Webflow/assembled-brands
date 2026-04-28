import { relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const teamSchema = sqliteTable('teams', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const teamMemberSchema = sqliteTable('team_members', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	team_id: integer('team_id').notNull(),
	user_id: integer('user_id').notNull(),
	role: text('role', { enum: ['host', 'member'] }).default('member'),
	created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const userSchema = sqliteTable('user', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	email: text('email').notNull().unique(),
	phone: text('phone').notNull().default(''),
	dial_code: text('dial_code').notNull().default(''),
	password: text('password').notNull(),
	reset_token: text('reset_token'),
	email_token: text('email_token'),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	role: text('role', { enum: ['admin', 'super-admin', 'user'] }).default('user'),
	profile_picture: text('profile_picture'),
	bio: text('bio'),
	custom_id: text('custom_id'),
	is_verified: integer('is_verified', { mode: 'boolean' }).default(false),
	stripe_customer_id: text('stripe_customer_id'),
	subscription_id: text('subscription_id'),
	subscription_product: text('subscription_product', { enum: ['free', 'basic', 'popular', 'advanced'] }).default('free'),
	subscription_status: text('subscription_status', {
		enum: ['trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'paused', 'unpaid'],
	}),
	trial_ends_at: integer('trial_ends_at', { mode: 'timestamp' }),
	auth_provider: text('auth_provider', { enum: ['local'] }).default('local'),
	first_name: text('first_name').notNull().default(''),
	last_name: text('last_name').notNull().default(''),
	loan_urgency: text('loan_urgency', { enum: ['none', 'yesterday', 'this-month', '3-months', 'this-year'] }).default('none'),
});

export const businessSchema = sqliteTable('businesses', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	legal_name: text('legal_name').notNull(),
	headquarters: text('headquarters'),
	year_formed: text('year_formed'),
	accounting_software: text('accounting_software'),
	other_accounting_software: text('other_accounting_software'),
	description: text('description'),
	folder_id: text('folder_id').notNull().default(''),
	logo_asset_id: integer('logo_asset_id').references(() => assetsSchema.id),
	user_id: integer('user_id')
		.references(() => userSchema.id)
		.notNull(),
	updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const assetsSchema = sqliteTable('assets', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	asset_name: text('asset_name').notNull(),
	asset_type: text('asset_type', { enum: ['image', 'video', 'audio', 'document', 'profile_picture'] }).default('image'),
	content_type: text('content_type'),
	asset_url: text('asset_url'),
	asset_size: text('asset_size'),
	duration: integer('duration'),
	hls_url: text('hls_url'),
	processing_status: text('processing_status', { enum: ['pending', 'processing', 'completed'] }).default('pending'),
	upload_id: text('upload_id'),
	mediaconvert_job_id: text('mediaconvert_job_id'),
	mediaconvert_job_status: text('mediaconvert_job_status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),
	mediaconvert_job_progress: integer('mediaconvert_job_progress').default(0),
	mediaconvert_job_current_phase: text('mediaconvert_job_current_phase'),
	upload_status: text('upload_status', { enum: ['pending', 'completed', 'failed'] }).default('pending'),
	user_id: integer('user_id')
		.references(() => userSchema.id)
		.notNull(),
	created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const subscriptionSchema = sqliteTable('subscription', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	user_id: integer('user_id').notNull(),
	object: text('object').notNull(),
	amount_subtotal: integer('amount_subtotal').notNull(),
	amount_total: integer('amount_total').notNull(),
	session_id: text('session_id').notNull(),
	cancel_url: text('cancel_url').notNull(),
	success_url: text('success_url').notNull(),
	created: integer('created').notNull(),
	currency: text('currency').notNull(),
	mode: text('mode').notNull(),
	payment_status: text('payment_status').notNull(),
	status: text('status').notNull(),
	subscription_id: text('subscription_id'),
});

export const teamInvitationSchema = sqliteTable('team_invitations', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	team_id: integer('team_id')
		.references(() => teamSchema.id)
		.notNull(),
	inviter_id: integer('inviter_id')
		.references(() => userSchema.id)
		.notNull(),
	invitee_email: text('invitee_email').notNull(),
	invitee_name: text('invitee_name').notNull(),
	user_defined_role: text('user_defined_role').notNull().default(''),
	message: text('message').default(''),
	status: text('status', { enum: ['pending', 'accepted', 'rejected'] }).default('pending'),
	created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const notificationsSchema = sqliteTable('notifications', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	user_id: integer('user_id')
		.references(() => userSchema.id)
		.notNull(),
	notification_type: text('notification_type', {
		enum: ['comment', 'like', 'system', 'new_lead', 'new_booking', 'new_payment', 'reminder'],
	}).notNull(),
	is_read: integer('is_read', { mode: 'boolean' }).default(false),
	title: text('title'),
	message: text('message'),
	link: text('link'),
	metadata: text('metadata', { mode: 'json' }),
	created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const hubspotContactWebhookSchema = sqliteTable(
	'hubspot_contact_webhook_events',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		app_id: integer('app_id').notNull(),
		event_id: integer('event_id').notNull(),
		subscription_id: integer('subscription_id').notNull(),
		portal_id: integer('portal_id').notNull(),
		occurred_at: integer('occurred_at').notNull(),
		subscription_type: text('subscription_type').notNull(),
		attempt_number: integer('attempt_number').notNull(),
		object_id: integer('object_id').notNull(),
		change_source: text('change_source').notNull(),
		change_flag: text('change_flag').notNull(),
		status: text('status', {
			enum: ['pending', 'processed', 'failed', 'skipped'],
		})
			.notNull()
			.default('pending'),
		error_message: text('error_message'),
		user_id: integer('user_id').references(() => userSchema.id),
		created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
		updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	},
	(t) => [uniqueIndex('hubspot_webhook_portal_event_subscription_unique').on(t.portal_id, t.event_id, t.subscription_id)],
);

export const hubspotDealWebhookSchema = sqliteTable(
	'hubspot_deal_webhook_events',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		// Webhook envelope
		app_id: integer('app_id').notNull(),
		event_id: integer('event_id').notNull(),
		subscription_id: integer('subscription_id').notNull(),
		portal_id: integer('portal_id').notNull(),
		occurred_at: integer('occurred_at').notNull(),
		subscription_type: text('subscription_type').notNull(),
		attempt_number: integer('attempt_number').notNull(),
		object_id: integer('object_id').notNull(),
		change_source: text('change_source').notNull(),
		change_flag: text('change_flag').notNull(),
		// Deal properties fetched from HubSpot
		deal_name: text('deal_name'),
		amount: text('amount'),
		deal_stage: text('deal_stage'),
		pipeline: text('pipeline'),
		close_date: text('close_date'),
		hubspot_owner_id: text('hubspot_owner_id'),
		// Processing state
		status: text('status', { enum: ['pending', 'processed', 'failed', 'skipped'] })
			.notNull()
			.default('pending'),
		error_message: text('error_message'),
		user_id: integer('user_id').references(() => userSchema.id),
		created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
		updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	},
	(t) => [uniqueIndex('hubspot_deal_webhook_portal_event_subscription_unique').on(t.portal_id, t.event_id, t.subscription_id)],
);

export const hubspotDealWebhookRelations = relations(hubspotDealWebhookSchema, ({ one }) => ({
	user: one(userSchema, {
		fields: [hubspotDealWebhookSchema.user_id],
		references: [userSchema.id],
	}),
}));

export const emailsSchema = sqliteTable('emails', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	email: text('email').notNull(),
	subject: text('subject').notNull(),
	title: text('title').notNull(),
	subtitle: text('subtitle').notNull(),
	body: text('body').notNull(),
	button_text: text('button_text').notNull(),
	button_link: text('button_link').notNull(),
	created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	checked: integer('checked', { mode: 'boolean' }).default(false),
	starred: integer('starred', { mode: 'boolean' }).default(false),
	flagged: integer('flagged', { mode: 'boolean' }).default(false),
	host_id: integer('host_id')
		.references(() => userSchema.id)
		.notNull(),
	status: text('status', { enum: ['draft', 'sent', 'failed'] }).default('draft'),
	updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const onboardingApplicationSchema = sqliteTable('onboarding_applications', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	user_id: integer('user_id')
		.references(() => userSchema.id)
		.notNull(),

	// Step 1: Company Info
	legal_name: text('legal_name'),
	employee_count: text('employee_count', {
		enum: ['just_me', '2-10', '11-50', '51-100', '101-500', '501+'],
	}),
	website: text('website'),

	// Step 2: Business Details
	years_in_business: text('years_in_business'),
	asset_type: text('asset_type', {
		enum: ['inventory', 'accounts_receivable', 'purchase_orders', 'not_sure'],
	}),
	desired_loan_amount: text('desired_loan_amount'),

	// Warm-lead extra fields
	incorporation_state: text('incorporation_state'),
	net_revenue_last_12_months: text('net_revenue_last_12_months'),
	working_with_team_member: integer('working_with_team_member', { mode: 'boolean' }).default(false),
	team_member_email: text('team_member_email'),

	// Step 3: Qualification
	company_type: text('company_type', {
		enum: ['cpg', 'saas', 'consulting', 'distributor_wholesaler', 'service_provider', 'other'],
	}),
	company_type_other: text('company_type_other'), // Only if company_type is 'other'
	revenue_qualification: text('revenue_qualification', {
		enum: ['yes', 'no'],
	}), // $10MM+ in last 12 months

	// Status tracking
	current_step: integer('current_step').default(1), // 1, 2, or 3
	is_qualified: integer('is_qualified', { mode: 'boolean' }).default(false),
	is_complete: integer('is_complete', { mode: 'boolean' }).default(false),
	is_rejected: integer('is_rejected', { mode: 'boolean' }).default(false),
	rejection_reason: text('rejection_reason'),

	created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const onboardingApplicationRelations = relations(onboardingApplicationSchema, ({ one }) => ({
	user: one(userSchema, {
		fields: [onboardingApplicationSchema.user_id],
		references: [userSchema.id],
	}),
}));

export const financialWizardApplicationSchema = sqliteTable('financial_wizard_applications', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	user_id: integer('user_id')
		.references(() => userSchema.id)
		.notNull(),

	// Progress tracking
	current_page: text('current_page', {
		enum: ['company-profile', 'financial-overview', 'financial-reports', 'accounts-inventory', 'ecommerce-performance', 'team-ownership'],
	}).default('company-profile'),
	is_complete: integer('is_complete', { mode: 'boolean' }).default(false),

	created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const financialOverviewSchema = sqliteTable('financial_overview', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	application_id: integer('application_id')
		.references(() => financialWizardApplicationSchema.id)
		.notNull(),

	// Financial data
	revenue_last_12_months: text('revenue_last_12_months'), // Store as string to handle large numbers/currency
	net_income_last_12_months: text('net_income_last_12_months'),
	projected_revenue_next_12_months: text('projected_revenue_next_12_months'),

	created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const financialDocumentSchema = sqliteTable('financial_documents', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	application_id: integer('application_id')
		.references(() => financialWizardApplicationSchema.id)
		.notNull(),
	asset_id: integer('asset_id')
		.references(() => assetsSchema.id)
		.notNull(),

	// Document categorization
	page: text('page', {
		enum: ['company-profile', 'financial-overview', 'financial-reports', 'accounts-inventory', 'ecommerce-performance', 'team-ownership'],
	}).notNull(), // Which page this document belongs to
	document_type: text('document_type', {
		enum: [
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
			'shopify_repeat_customers',
			'shopify_monthly_sales',
			// Team & Ownership (Step 5)
			'management_bios',
			'investor_deck',
			'cap_table',
			// Other
			'other',
		],
	}).notNull(),

	// Versioning
	is_current: integer('is_current', { mode: 'boolean' }).default(true), // Only one document per type should be current
	version: integer('version').default(1), // Incrementing version number

	// Optional metadata
	notes: text('notes'), // Optional notes about the document

	created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const financialStepFoldersSchema = sqliteTable('financial_step_folders', {
	id: integer('id').primaryKey({ autoIncrement: true }),

	business_id: integer('business_id')
		.references(() => businessSchema.id)
		.notNull(),
	user_id: integer('user_id')
		.references(() => userSchema.id)
		.notNull(),

	page: text('page', {
		enum: [
			'company-profile',
			'financial-overview',
			'financial-reports',
			'accounts-inventory',
			'ecommerce-performance',
			'team-ownership',
			'legal',
			'due-diligence',
			'financial-screener',
		],
	}).notNull(),

	folder_id: text('folder_id').notNull().default(''),

	created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Relations
export const financialWizardApplicationRelations = relations(financialWizardApplicationSchema, ({ one, many }) => ({
	user: one(userSchema, {
		fields: [financialWizardApplicationSchema.user_id],
		references: [userSchema.id],
	}),
	financialOverview: one(financialOverviewSchema, {
		fields: [financialWizardApplicationSchema.id],
		references: [financialOverviewSchema.application_id],
	}),
	documents: many(financialDocumentSchema),
}));

export const financialOverviewRelations = relations(financialOverviewSchema, ({ one }) => ({
	application: one(financialWizardApplicationSchema, {
		fields: [financialOverviewSchema.application_id],
		references: [financialWizardApplicationSchema.id],
	}),
}));

export const financialDocumentRelations = relations(financialDocumentSchema, ({ one }) => ({
	application: one(financialWizardApplicationSchema, {
		fields: [financialDocumentSchema.application_id],
		references: [financialWizardApplicationSchema.id],
	}),
	asset: one(assetsSchema, {
		fields: [financialDocumentSchema.asset_id],
		references: [assetsSchema.id],
	}),
}));

export const financialStepFoldersRelations = relations(financialStepFoldersSchema, ({ one }) => ({
	business: one(businessSchema, {
		fields: [financialStepFoldersSchema.business_id],
		references: [businessSchema.id],
	}),

	user: one(userSchema, {
		fields: [financialStepFoldersSchema.user_id],
		references: [userSchema.id],
	}),
}));

// Type exports
export type FinancialStepFolder = typeof financialStepFoldersSchema.$inferSelect;
export type NewFinancialStepFolder = typeof financialStepFoldersSchema.$inferInsert;

export type FinancialWizardApplication = typeof financialWizardApplicationSchema.$inferSelect;
export type NewFinancialWizardApplication = typeof financialWizardApplicationSchema.$inferInsert;
export type FinancialOverview = typeof financialOverviewSchema.$inferSelect;
export type NewFinancialOverview = typeof financialOverviewSchema.$inferInsert;
export type FinancialDocument = typeof financialDocumentSchema.$inferSelect;
export type NewFinancialDocument = typeof financialDocumentSchema.$inferInsert;

export type OnboardingApplication = typeof onboardingApplicationSchema.$inferSelect;
export type NewOnboardingApplication = typeof onboardingApplicationSchema.$inferInsert;

export type Email = typeof emailsSchema.$inferSelect;
export type NewEmail = typeof emailsSchema.$inferInsert;

export type Notification = typeof notificationsSchema.$inferSelect;
export type NewNotification = typeof notificationsSchema.$inferInsert;
export type HubspotContactWebhook = typeof hubspotContactWebhookSchema.$inferSelect;
export type NewHubspotContactWebhook = typeof hubspotContactWebhookSchema.$inferInsert;
export type HubspotDealWebhook = typeof hubspotDealWebhookSchema.$inferSelect;
export type NewHubspotDealWebhook = typeof hubspotDealWebhookSchema.$inferInsert;
export type Asset = typeof assetsSchema.$inferSelect;
export type NewAsset = typeof assetsSchema.$inferInsert;
export type User = typeof userSchema.$inferSelect & {
	business?: typeof businessSchema.$inferSelect | null;
};
export type TeamMember = typeof teamMemberSchema.$inferSelect;
export type NewTeamMember = typeof teamMemberSchema.$inferInsert;

export type NewUser = typeof userSchema.$inferInsert;
export type NewBusiness = typeof businessSchema.$inferInsert;
export type Business = typeof businessSchema.$inferSelect;

// Define relations
export const userRelations = relations(userSchema, ({ one }) => ({
	business: one(businessSchema, {
		fields: [userSchema.id],
		references: [businessSchema.user_id],
	}),
}));

export const notificationRelations = relations(notificationsSchema, ({ one }) => ({
	user: one(userSchema, {
		fields: [notificationsSchema.user_id],
		references: [userSchema.id],
	}),
}));

export const hubspotContactWebhookRelations = relations(hubspotContactWebhookSchema, ({ one }) => ({
	user: one(userSchema, {
		fields: [hubspotContactWebhookSchema.user_id],
		references: [userSchema.id],
	}),
}));

export const businessRelations = relations(businessSchema, ({ one }) => ({
	user: one(userSchema, {
		fields: [businessSchema.user_id],
		references: [userSchema.id],
	}),
}));

export const teamRelations = relations(teamSchema, ({ many }) => ({
	members: many(teamMemberSchema),
	invitations: many(teamInvitationSchema),
}));

export const teamMemberRelations = relations(teamMemberSchema, ({ one }) => ({
	team: one(teamSchema, {
		fields: [teamMemberSchema.team_id],
		references: [teamSchema.id],
	}),
	user: one(userSchema, {
		fields: [teamMemberSchema.user_id],
		references: [userSchema.id],
	}),
}));

export const teamInvitationRelations = relations(teamInvitationSchema, ({ one }) => ({
	team: one(teamSchema, {
		fields: [teamInvitationSchema.team_id],
		references: [teamSchema.id],
	}),
	inviter: one(userSchema, {
		fields: [teamInvitationSchema.inviter_id],
		references: [userSchema.id],
	}),
}));

export const schema = {
	userSchema,
	businessSchema,
	assetsSchema,
	subscriptionSchema,
	teamSchema,
	teamMemberSchema,
	teamInvitationSchema,
	notificationsSchema,
	hubspotContactWebhookSchema,
	hubspotDealWebhookSchema,
	emailsSchema,
	onboardingApplicationSchema,
	financialWizardApplicationSchema,
	financialOverviewSchema,
	financialDocumentSchema,

	userRelations,
	notificationRelations,
	hubspotContactWebhookRelations,
	hubspotDealWebhookRelations,
	businessRelations,
	teamRelations,
	teamMemberRelations,
	teamInvitationRelations,
	onboardingApplicationRelations,
	financialWizardApplicationRelations,
	financialOverviewRelations,
	financialDocumentRelations,
};
