import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type { Email, NewEmail, schema } from '../schema/schema.ts';
import { emailsSchema } from '../schema/schema.ts';

/**
 * Repository for queued emails
 */
export class EmailRepository {
	private db: DrizzleD1Database<typeof schema>;

	/**
	 * Construct the EmailRepository
	 * @param {DrizzleD1Database<typeof schema>} db - Database instance
	 */
	constructor(db: DrizzleD1Database<typeof schema>) {
		this.db = db;
	}

	/**
	 * Create a new email record
	 * @param {NewEmail} data - Email payload
	 * @returns {Promise<Email[]>} Inserted email record(s)
	 */
	public async createEmail(data: NewEmail) {
		return this.db.insert(emailsSchema).values(data).returning();
	}

	/**
	 * Bulk insert multiple emails
	 * @param {NewEmail[]} data - Array of email payloads
	 * @returns {Promise<Email[]>} Inserted email records
	 */
	public async bulkAddEmails(data: NewEmail[]) {
		return this.db.insert(emailsSchema).values(data).returning();
	}

	/**
	 * Find an email by ID
	 * @param {number} id - Email ID
	 * @returns {Promise<Email|undefined>} Email if found
	 */
	public async findEmailById(id: number) {
		return this.db.query.emailsSchema.findFirst({
			where: eq(emailsSchema.id, id),
		});
	}

	/**
	 * Get emails associated with a host
	 * @param {number} hostId - Host user ID
	 * @returns {Promise<Email[]>} List of emails
	 */
	public async findEmailsByHostId(hostId: number) {
		return this.db.query.emailsSchema.findMany({
			where: eq(emailsSchema.host_id, hostId),
			orderBy: (emails, { desc }) => [desc(emails.created_at)],
		});
	}

	/**
	 * Update an email record
	 * @param {number} id - Email ID
	 * @param {Partial<Email>} data - Fields to update
	 * @returns {Promise<void>}
	 */
	public async updateEmail(id: number, data: Partial<Email>) {
		return this.db.update(emailsSchema).set(data).where(eq(emailsSchema.id, id));
	}

	/**
	 * Delete an email by ID
	 * @param {number} id - Email ID
	 * @returns {Promise<void>}
	 */
	public async deleteEmail(id: number) {
		return this.db.delete(emailsSchema).where(eq(emailsSchema.id, id));
	}

	/**
	 * Soft delete an email by marking it as sent
	 * @param {number} id - Email ID
	 * @returns {Promise<void>}
	 */
	public async softDeleteEmail(id: number) {
		return this.db.update(emailsSchema).set({ status: 'sent' }).where(eq(emailsSchema.id, id));
	}
}
