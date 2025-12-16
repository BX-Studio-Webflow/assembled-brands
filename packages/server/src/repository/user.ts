import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import { type NewUser, schema, type User, userSchema } from '../schema/schema.js';

export class UserRepository {
	private db: DrizzleD1Database<typeof schema>;

	constructor(db: DrizzleD1Database<typeof schema>) {
		this.db = db;
	}

	public async create(user: NewUser) {
		return this.db.insert(userSchema).values(user).returning();
	}

	public async find(id: number) {
		return this.db.query.userSchema.findFirst({
			where: eq(userSchema.id, id),
			with: {
				business: true,
			},
		});
	}

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

	public async update(id: number, user: Partial<User>) {
		return this.db.update(userSchema).set(user).where(eq(userSchema.id, id));
	}

	public async delete(id: number) {
		return this.db.delete(userSchema).where(eq(userSchema.id, id));
	}

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
