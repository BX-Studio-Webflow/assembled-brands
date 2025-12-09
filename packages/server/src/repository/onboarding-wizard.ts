import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type { NewOnboardingApplication, schema } from '../schema/schema.js';
import { onboardingApplicationSchema } from '../schema/schema.js';

export class OnboardingWizardRepository {
	private db: DrizzleD1Database<typeof schema>;

	constructor(db: DrizzleD1Database<typeof schema>) {
		this.db = db;
	}

	public async create(application: NewOnboardingApplication) {
		return this.db.insert(onboardingApplicationSchema).values(application).returning();
	}

	public async findById(id: number) {
		return this.db.query.onboardingApplicationSchema.findFirst({
			where: eq(onboardingApplicationSchema.id, id),
		});
	}

	public async findByUserId(userId: number) {
		return this.db.query.onboardingApplicationSchema.findFirst({
			where: eq(onboardingApplicationSchema.user_id, userId),
		});
	}

	public async update(id: number, data: Partial<NewOnboardingApplication>) {
		return this.db.update(onboardingApplicationSchema).set(data).where(eq(onboardingApplicationSchema.id, id));
	}

	public async updateByUserId(userId: number, data: Partial<NewOnboardingApplication>) {
		return this.db.update(onboardingApplicationSchema).set(data).where(eq(onboardingApplicationSchema.user_id, userId));
	}

	public async delete(id: number) {
		return this.db.delete(onboardingApplicationSchema).where(eq(onboardingApplicationSchema.id, id));
	}

	public async deleteByUserId(userId: number) {
		return this.db.delete(onboardingApplicationSchema).where(eq(onboardingApplicationSchema.user_id, userId));
	}
}
