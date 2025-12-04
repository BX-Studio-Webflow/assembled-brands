import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import { emailsSchema } from '../schema/schema.ts';
import type { Email, NewEmail } from '../schema/schema.ts';

export class EmailRepository {
  private db: DrizzleD1Database;

  constructor(db: DrizzleD1Database) {
    this.db = db;
  }

  public async createEmail(data: NewEmail) {
    return this.db.insert(emailsSchema).values(data).returning();
  }

  public async bulkAddEmails(data: NewEmail[]) {
    return this.db.insert(emailsSchema).values(data).returning();
  }

  public async findEmailById(id: number) {
    return this.db.query.emailsSchema.findFirst({
      where: eq(emailsSchema.id, id),
    });
  }

  public async findEmailsByHostId(hostId: number) {
    return this.db.query.emailsSchema.findMany({
      where: eq(emailsSchema.host_id, hostId),
      orderBy: (emails, { desc }) => [desc(emails.created_at)],
    });
  }

  public async updateEmail(id: number, data: Partial<Email>) {
    return this.db.update(emailsSchema).set(data).where(eq(emailsSchema.id, id));
  }

  public async deleteEmail(id: number) {
    return this.db.delete(emailsSchema).where(eq(emailsSchema.id, id));
  }

  public async softDeleteEmail(id: number) {
    return this.db.update(emailsSchema).set({ status: 'sent' }).where(eq(emailsSchema.id, id));
  }
}
