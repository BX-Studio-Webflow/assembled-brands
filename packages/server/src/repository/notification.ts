import { and, desc, eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type { NewNotification, schema } from '../schema/schema.js';
import { notificationsSchema } from '../schema/schema.js';

export class NotificationRepository {
  private db: DrizzleD1Database<typeof schema>;

  constructor(db: DrizzleD1Database<typeof schema>) {
    this.db = db;
  }

  public async create(notification: NewNotification) {
    return this.db.insert(notificationsSchema).values(notification).returning();
  }

  public async findById(id: number) {
    return this.db.query.notificationsSchema.findFirst({
      where: eq(notificationsSchema.id, id),
    });
  }

  public async findByUserId(userId: number) {
    return this.db.query.notificationsSchema.findMany({
      where: eq(notificationsSchema.user_id, userId),
      orderBy: [desc(notificationsSchema.created_at)],
    });
  }

  public async findUnreadByUserId(userId: number) {
    return this.db.query.notificationsSchema.findMany({
      where: and(eq(notificationsSchema.user_id, userId), eq(notificationsSchema.is_read, false)),
      orderBy: [desc(notificationsSchema.created_at)],
    });
  }

  public async update(id: number, data: Partial<NewNotification>) {
    return this.db.update(notificationsSchema).set(data).where(eq(notificationsSchema.id, id));
  }

  public async markAsRead(id: number) {
    return this.db
      .update(notificationsSchema)
      .set({ is_read: true })
      .where(eq(notificationsSchema.id, id));
  }

  public async markAllAsRead(userId: number) {
    return this.db
      .update(notificationsSchema)
      .set({ is_read: true })
      .where(eq(notificationsSchema.user_id, userId));
  }

  public async delete(id: number) {
    return this.db.delete(notificationsSchema).where(eq(notificationsSchema.id, id));
  }

  public async deleteByUserId(userId: number) {
    return this.db.delete(notificationsSchema).where(eq(notificationsSchema.user_id, userId));
  }

  public async getUnreadCount(userId: number) {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(notificationsSchema)
      .where(and(eq(notificationsSchema.user_id, userId), eq(notificationsSchema.is_read, false)));

    return result[0]?.count || 0;
  }
}
