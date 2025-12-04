import { relations, sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	phone: text('phone').notNull().default(''),
	dial_code: text('dial_code').notNull().default(''),
	password: text('password').notNull(),
	reset_token: text('reset_token'),
	email_token: text('email_token'),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
	role: text('role', { enum: ['master', 'owner', 'host'] }).default('host'),
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
});

export const businessSchema = sqliteTable('businesses', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	address: text('address'),
	phone: text('phone'),
	dial_code: text('dial_code'),
	email: text('email'),
	description: text('description'),
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

export type Email = typeof emailsSchema.$inferSelect;
export type NewEmail = typeof emailsSchema.$inferInsert;

export type Notification = typeof notificationsSchema.$inferSelect;
export type NewNotification = typeof notificationsSchema.$inferInsert;
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
	emailsSchema,

	userRelations,
	notificationRelations,
	businessRelations,
	teamRelations,
	teamMemberRelations,
	teamInvitationRelations,
};
