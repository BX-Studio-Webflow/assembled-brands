import { and, desc, eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type { NewNotification, schema } from '../schema/schema.js';
import { notificationsSchema } from '../schema/schema.js';

/**
 * Repository for user notifications
 */
export class NotificationRepository {
	private db: DrizzleD1Database<typeof schema>;

	/**
	 * Construct the NotificationRepository
	 * @param {DrizzleD1Database<typeof schema>} db - Database instance
	 */
	constructor(db: DrizzleD1Database<typeof schema>) {
		this.db = db;
	}

	/**
	 * Create a notification record
	 * @param {NewNotification} notification - Notification payload
	 * @returns {Promise<Notification[]>} Inserted notification record(s)
	 */
	public async create(notification: NewNotification) {
		return this.db.insert(notificationsSchema).values(notification).returning();
	}

	/**
	 * Find a notification by ID
	 * @param {number} id - Notification ID
	 * @returns {Promise<Notification|undefined>} Notification if found
	 */
	public async findById(id: number) {
		return this.db.query.notificationsSchema.findFirst({
			where: eq(notificationsSchema.id, id),
		});
	}

	/**
	 * Get notifications for a user ordered by newest first
	 * @param {number} userId - User ID
	 * @returns {Promise<Notification[]>} List of notifications
	 */
	public async findByUserId(userId: number) {
		return this.db.query.notificationsSchema.findMany({
			where: eq(notificationsSchema.user_id, userId),
			orderBy: [desc(notificationsSchema.created_at)],
		});
	}

	/**
	 * Get unread notifications for a user
	 * @param {number} userId - User ID
	 * @returns {Promise<Notification[]>} Unread notifications
	 */
	public async findUnreadByUserId(userId: number) {
		return this.db.query.notificationsSchema.findMany({
			where: and(eq(notificationsSchema.user_id, userId), eq(notificationsSchema.is_read, false)),
			orderBy: [desc(notificationsSchema.created_at)],
		});
	}

	/**
	 * Update a notification record
	 * @param {number} id - Notification ID
	 * @param {Partial<NewNotification>} data - Fields to update
	 * @returns {Promise<void>}
	 */
	public async update(id: number, data: Partial<NewNotification>) {
		return this.db.update(notificationsSchema).set(data).where(eq(notificationsSchema.id, id));
	}

	/**
	 * Mark a notification as read
	 * @param {number} id - Notification ID
	 * @returns {Promise<void>}
	 */
	public async markAsRead(id: number) {
		return this.db.update(notificationsSchema).set({ is_read: true }).where(eq(notificationsSchema.id, id));
	}

	/**
	 * Mark all notifications as read for a user
	 * @param {number} userId - User ID
	 * @returns {Promise<void>}
	 */
	public async markAllAsRead(userId: number) {
		return this.db.update(notificationsSchema).set({ is_read: true }).where(eq(notificationsSchema.user_id, userId));
	}

	/**
	 * Delete a notification by ID
	 * @param {number} id - Notification ID
	 * @returns {Promise<void>}
	 */
	public async delete(id: number) {
		return this.db.delete(notificationsSchema).where(eq(notificationsSchema.id, id));
	}

	/**
	 * Delete notifications for a given user
	 * @param {number} userId - User ID
	 * @returns {Promise<void>}
	 */
	public async deleteByUserId(userId: number) {
		return this.db.delete(notificationsSchema).where(eq(notificationsSchema.user_id, userId));
	}

	/**
	 * Get the number of unread notifications for a user
	 * @param {number} userId - User ID
	 * @returns {Promise<number>} Unread notification count
	 */
	public async getUnreadCount(userId: number) {
		const result = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(notificationsSchema)
			.where(and(eq(notificationsSchema.user_id, userId), eq(notificationsSchema.is_read, false)));

		return result[0]?.count || 0;
	}
}
