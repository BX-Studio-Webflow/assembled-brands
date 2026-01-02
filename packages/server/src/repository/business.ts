import { and, desc, eq, like } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import { businessSchema, schema } from '../schema/schema.js';
import type { BusinessQuery } from '../web/validator/business.ts';

/**
 * Repository for business records
 */
export class BusinessRepository {
	private db: DrizzleD1Database<typeof schema>;

	/**
	 * Construct the BusinessRepository
	 * @param {DrizzleD1Database<typeof schema>} db - Database instance
	 */
	constructor(db: DrizzleD1Database<typeof schema>) {
		this.db = db;
	}

	/**
	 * Create a business record and return the created record
	 * @param {typeof businessSchema.$inferInsert} business - Business payload
	 * @returns {Promise<typeof businessSchema.$inferSelect>} Created business
	 */
	async create(business: typeof businessSchema.$inferInsert) {
		const result = await this.db.insert(businessSchema).values(business).returning();
		return await this.findById(result[0].id);
	}

	async findById(id: number) {
		/**
		 * Find a business by ID
		 * @param {number} id - Business ID
		 * @returns {Promise<typeof businessSchema.$inferSelect|undefined>} Business if found
		 */
		const result = await this.db.select().from(businessSchema).where(eq(businessSchema.id, id)).limit(1);
		return result[0];
	}

	/**
	 * Find a business by user ID
	 * @param {number} userId - User ID
	 * @returns {Promise<typeof businessSchema.$inferSelect|undefined>} Business if found
	 */
	async findByUserId(userId: number) {
		const result = await this.db.select().from(businessSchema).where(eq(businessSchema.user_id, userId)).limit(1);
		return result[0];
	}

	/**
	 * List businesses with optional search and pagination
	 * @param {BusinessQuery} [query] - Pagination and search options
	 * @returns {Promise<{businesses: typeof businessSchema.$inferSelect[], total: number}>}
	 */
	async findAll(query?: BusinessQuery) {
		const { page = 1, limit = 10, search } = query || {};
		const offset = (page - 1) * limit;

		const whereConditions = [];
		if (search) {
			whereConditions.push(like(businessSchema.legal_name, `%${search}%`));
		}

		const businesses = await this.db
			.select()
			.from(businessSchema)
			.where(whereConditions.length ? and(...whereConditions) : undefined)
			.limit(limit)
			.offset(offset)
			.orderBy(desc(businessSchema.created_at));

		return { businesses, total: businesses.length };
	}

	/**
	 * Update a business record and return the updated record
	 * @param {number} id - Business ID
	 * @param {Partial<typeof businessSchema.$inferSelect>} business - Partial business fields
	 * @returns {Promise<typeof businessSchema.$inferSelect|undefined>} Updated business
	 */
	async update(id: number, business: Partial<typeof businessSchema.$inferSelect>) {
		await this.db.update(businessSchema).set(business).where(eq(businessSchema.id, id));
		return await this.findById(id);
	}
}
