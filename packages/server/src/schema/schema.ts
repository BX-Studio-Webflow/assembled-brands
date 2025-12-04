import { relations } from 'drizzle-orm';
import { boolean, int, json, mysqlEnum, mysqlTable, serial, text, timestamp, varchar } from 'drizzle-orm/mysql-core';

export const teamSchema = mysqlTable('teams', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const teamMemberSchema = mysqlTable('team_members', {
	id: serial('id').primaryKey(),
	team_id: int('team_id').notNull(),
	user_id: int('user_id').notNull(),
	role: mysqlEnum('role', ['host', 'member']).default('member'),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const userSchema = mysqlTable('user', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 50 }).notNull(),
	email: varchar('email', { length: 100 }).notNull().unique(),
	phone: varchar('phone', { length: 100 }).notNull().default(''),
	dial_code: varchar('dial_code', { length: 10 }).notNull().default(''),
	password: varchar('password', { length: 255 }).notNull(),
	reset_token: varchar('reset_token', { length: 255 }),
	email_token: varchar('email_token', { length: 255 }),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
	role: mysqlEnum('role', ['master', 'owner', 'host']).default('host'),
	profile_picture: text('profile_picture'),
	bio: varchar('bio', { length: 255 }),
	custom_id: varchar('custom_id', { length: 255 }),
	is_verified: boolean('is_verified').default(false),
	stripe_customer_id: varchar('stripe_customer_id', { length: 255 }),
	subscription_id: varchar('subscription_id', { length: 255 }),
	subscription_product: mysqlEnum('subscription_product', ['free', 'basic', 'popular', 'advanced']).default('free'),
	subscription_status: mysqlEnum('subscription_status', [
		'trialing',
		'active',
		'past_due',
		'canceled',
		'incomplete',
		'incomplete_expired',
		'paused',
		'unpaid',
	]),
	trial_ends_at: timestamp('trial_ends_at'),
	auth_provider: mysqlEnum('auth_provider', ['local']).default('local'),
});

export const businessSchema = mysqlTable('businesses', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 50 }).notNull(),
	address: varchar('address', { length: 255 }),
	phone: varchar('phone', { length: 255 }),
	dial_code: varchar('dial_code', { length: 10 }),
	email: varchar('email', { length: 255 }),
	description: text('description'),
	logo_asset_id: int('logo_asset_id').references(() => assetsSchema.id),
	user_id: int('user_id')
		.references(() => userSchema.id)
		.notNull(),
	updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
	created_at: timestamp('created_at').defaultNow(),
});

export const assetsSchema = mysqlTable('assets', {
	id: serial('id').primaryKey(),
	asset_name: varchar('asset_name', { length: 255 }).notNull(),
	asset_type: mysqlEnum('asset_type', ['image', 'video', 'audio', 'document', 'profile_picture']).default('image'),
	content_type: varchar('content_type', { length: 100 }),
	asset_url: text('asset_url'),
	asset_size: text('asset_size'),
	duration: int('duration'),
	hls_url: text('hls_url'),
	processing_status: mysqlEnum('processing_status', ['pending', 'processing', 'completed']).default('pending'),
	upload_id: varchar('upload_id', { length: 255 }),
	mediaconvert_job_id: varchar('mediaconvert_job_id', { length: 255 }),
	mediaconvert_job_status: mysqlEnum('mediaconvert_job_status', ['pending', 'processing', 'completed', 'failed']).default('pending'),
	mediaconvert_job_progress: int('mediaconvert_job_progress').default(0),
	mediaconvert_job_current_phase: varchar('mediaconvert_job_current_phase', { length: 255 }),
	upload_status: mysqlEnum('upload_status', ['pending', 'completed', 'failed']).default('pending'),
	user_id: int('user_id')
		.references(() => userSchema.id)
		.notNull(),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const subscriptionSchema = mysqlTable('subscription', {
	id: serial('id').primaryKey(),
	created_at: timestamp('created_at').defaultNow(),
	user_id: int('user_id').notNull(),
	object: text('object').notNull(),
	amount_subtotal: int('amount_subtotal').notNull(),
	amount_total: int('amount_total').notNull(),
	session_id: text('session_id').notNull(),
	cancel_url: text('cancel_url').notNull(),
	success_url: text('success_url').notNull(),
	created: int('created').notNull(),
	currency: text('currency').notNull(),
	mode: text('mode').notNull(),
	payment_status: text('payment_status').notNull(),
	status: text('status').notNull(),
	subscription_id: text('subscription_id'),
});

export const teamInvitationSchema = mysqlTable('team_invitations', {
	id: serial('id').primaryKey(),
	team_id: int('team_id')
		.references(() => teamSchema.id)
		.notNull(),
	inviter_id: int('inviter_id')
		.references(() => userSchema.id)
		.notNull(),
	invitee_email: varchar('invitee_email', { length: 255 }).notNull(),
	status: mysqlEnum('status', ['pending', 'accepted', 'rejected']).default('pending'),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const notificationsSchema = mysqlTable('notifications', {
	id: serial('id').primaryKey(),
	user_id: int('user_id')
		.references(() => userSchema.id)
		.notNull(),
	notification_type: mysqlEnum('notification_type', [
		'comment',
		'like',
		'system',
		'new_lead',
		'new_booking',
		'new_payment',
		'reminder',
	]).notNull(),
	is_read: boolean('is_read').default(false),
	title: varchar('title', { length: 255 }),
	message: text('message'),
	link: text('link'),
	metadata: json('metadata'),
	created_at: timestamp('created_at').defaultNow(),
	updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const emailsSchema = mysqlTable('emails', {
	id: serial('id').primaryKey(),
	email: varchar('email', { length: 255 }).notNull(),
	subject: varchar('subject', { length: 255 }).notNull(),
	title: varchar('title', { length: 255 }).notNull(),
	subtitle: varchar('subtitle', { length: 255 }).notNull(),
	body: text('body').notNull(),
	button_text: varchar('button_text', { length: 255 }).notNull(),
	button_link: varchar('button_link', { length: 255 }).notNull(),
	created_at: timestamp('created_at').defaultNow(),
	checked: boolean('checked').default(false),
	starred: boolean('starred').default(false),
	flagged: boolean('flagged').default(false),
	host_id: int('host_id')
		.references(() => userSchema.id)
		.notNull(),
	status: mysqlEnum('status', ['draft', 'sent', 'failed']).default('draft'),
	updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
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
