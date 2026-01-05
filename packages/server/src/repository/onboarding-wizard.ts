import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type { NewOnboardingApplication, schema } from '../schema/schema.js';
import { onboardingApplicationSchema } from '../schema/schema.js';

export class OnboardingWizardRepository {
	private db: DrizzleD1Database<typeof schema>;

	/**
	 * Construct the repository
	 * @param {DrizzleD1Database<typeof schema>} db - Drizzle D1 database instance
	 */
	constructor(db: DrizzleD1Database<typeof schema>) {
		this.db = db;
	}

	/**
	 * Create a new onboarding application
	 * @param {NewOnboardingApplication} application - Application record to create
	 * @returns {Promise<OnboardingApplication[]>} Inserted application record(s)
	 */
	public async create(application: NewOnboardingApplication) {
		return this.db.insert(onboardingApplicationSchema).values(application).returning();
	}

	/**
	 * Find an onboarding application by ID
	 * @param {number} id - Application ID
	 * @returns {Promise<OnboardingApplication|undefined>} The application if found
	 */
	public async findById(id: number) {
		return this.db.query.onboardingApplicationSchema.findFirst({
			where: eq(onboardingApplicationSchema.id, id),
		});
	}

	/**
	 * Find an onboarding application by user ID
	 * @param {number} userId - User ID
	 * @returns {Promise<OnboardingApplication|undefined>} The application if found
	 */
	public async findByUserId(userId: number) {
		return this.db.query.onboardingApplicationSchema.findFirst({
			where: eq(onboardingApplicationSchema.user_id, userId),
		});
	}

	/**
	 * Update an onboarding application by ID
	 * @param {number} id - Application ID
	 * @param {Partial<NewOnboardingApplication>} data - Partial fields to update
	 * @returns {Promise<void>}
	 */
	public async update(id: number, data: Partial<NewOnboardingApplication>) {
		return this.db.update(onboardingApplicationSchema).set(data).where(eq(onboardingApplicationSchema.id, id));
	}

	/**
	 * Update an onboarding application by user ID
	 * @param {number} userId - User ID
	 * @param {Partial<NewOnboardingApplication>} data - Partial fields to update
	 * @returns {Promise<void>}
	 */
	public async updateByUserId(userId: number, data: Partial<NewOnboardingApplication>) {
		return this.db.update(onboardingApplicationSchema).set(data).where(eq(onboardingApplicationSchema.user_id, userId));
	}

	/**
	 * Delete an onboarding application by ID
	 * @param {number} id - Application ID
	 * @returns {Promise<void>}
	 */
	public async delete(id: number) {
		return this.db.delete(onboardingApplicationSchema).where(eq(onboardingApplicationSchema.id, id));
	}

	/**
	 * Delete an onboarding application by user ID
	 * @param {number} userId - User ID
	 * @returns {Promise<void>}
	 */
	public async deleteByUserId(userId: number) {
		return this.db.delete(onboardingApplicationSchema).where(eq(onboardingApplicationSchema.user_id, userId));
	}
}
