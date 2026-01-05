import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import { type NewUser, schema, type User, userSchema } from '../schema/schema.js';

export class UserRepository {
	/**
	 * Drizzle D1 database instance
	 */
	private db: DrizzleD1Database<typeof schema>;

	/**
	 * Construct the user repository
	 * @param {DrizzleD1Database<typeof schema>} db - Drizzle D1 database instance
	 */
	constructor(db: DrizzleD1Database<typeof schema>) {
		this.db = db;
	}

	/**
	 * Create a new user
	 * @param {NewUser} user - User payload
	 * @returns {Promise<User[]>} Created user record(s)
	 */
	public async create(user: NewUser) {
		return this.db.insert(userSchema).values(user).returning();
	}

	/**
	 * Find a user by ID, including the user's business when available
	 * @param {number} id - User ID
	 * @returns {Promise<User|undefined>} The user if found
	 */
	public async find(id: number) {
		return this.db.query.userSchema.findFirst({
			where: eq(userSchema.id, id),
			with: {
				business: true,
			},
		});
	}

	/**
	 * Find a user by email, defaulting auth_provider to 'local' when absent
	 * @param {string} email - User email
	 * @returns {Promise<User|undefined>} The user if found
	 */
	public async findByEmail(email: string) {
		const user = await this.db.query.userSchema.findFirst({
			where: eq(userSchema.email, email),
			with: {
				business: true,
			},
		});
		if (user && !user.auth_provider) {
			user.auth_provider = 'local';
		}
		return user;
	}

	/**
	 * Update a user by ID
	 * @param {number} id - User ID
	 * @param {Partial<User>} user - Partial user fields to update
	 * @returns {Promise<void>}
	 */
	public async update(id: number, user: Partial<User>) {
		return this.db.update(userSchema).set(user).where(eq(userSchema.id, id));
	}

	/**
	 * Delete a user by ID
	 * @param {number} id - User ID
	 * @returns {Promise<void>}
	 */
	public async delete(id: number) {
		return this.db.delete(userSchema).where(eq(userSchema.id, id));
	}

	/**
	 * Get dashboard profile information for a user
	 * @param {number} id - User ID
	 * @returns {Promise<object>} Dashboard profile object
	 * @throws {Error} If the user is not found
	 */
	public async getDashboard(id: number) {
		// Get user profile with business info
		const user = await this.db.query.userSchema.findFirst({
			where: eq(userSchema.id, id),
			with: {
				business: true,
			},
		});

		if (!user) {
			throw new Error('User not found');
		}

		return {
			profile: {
				id: user.id,
				first_name: user.first_name,
				last_name: user.last_name,
				email: user.email,
				role: user.role,
				profile_picture: user.profile_picture,
				is_verified: user.is_verified,
				business: user.business,
				subscription_status: user.subscription_status,
				trial_ends_at: user.trial_ends_at,
			},
		};
	}
}
