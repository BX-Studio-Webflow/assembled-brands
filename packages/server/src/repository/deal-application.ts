import { and, desc, eq, ne } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import { dealApplicationSchema, type NewDealApplication, type schema } from '../schema/schema.js';

export class DealApplicationRepository {
	private db: DrizzleD1Database<typeof schema>;

	constructor(db: DrizzleD1Database<typeof schema>) {
		this.db = db;
	}

	public async create(data: NewDealApplication) {
		const [row] = await this.db.insert(dealApplicationSchema).values(data).returning();
		return row;
	}

	public async findById(id: number) {
		return this.db.query.dealApplicationSchema.findFirst({
			where: eq(dealApplicationSchema.id, id),
		});
	}

	public async findByHubspotDealObjectId(hubspotDealObjectId: number) {
		return this.db.query.dealApplicationSchema.findFirst({
			where: eq(dealApplicationSchema.hubspot_deal_object_id, hubspotDealObjectId),
		});
	}

	public async findByUserId(userId: number) {
		return this.db.query.dealApplicationSchema.findMany({
			where: eq(dealApplicationSchema.user_id, userId),
			orderBy: [desc(dealApplicationSchema.updated_at)],
		});
	}

	public async findActiveByUserId(userId: number) {
		return this.db.query.dealApplicationSchema.findFirst({
			where: and(eq(dealApplicationSchema.user_id, userId), eq(dealApplicationSchema.status, 'active')),
			orderBy: [desc(dealApplicationSchema.created_at)],
		});
	}

	public async supersedeActiveForUser(userId: number, exceptId?: number) {
		const conditions = [eq(dealApplicationSchema.user_id, userId), eq(dealApplicationSchema.status, 'active')];
		if (exceptId != null) {
			conditions.push(ne(dealApplicationSchema.id, exceptId));
		}
		await this.db
			.update(dealApplicationSchema)
			.set({ status: 'superseded', updated_at: new Date() })
			.where(and(...conditions));
	}

	public async update(id: number, data: Partial<NewDealApplication>) {
		await this.db.update(dealApplicationSchema).set(data).where(eq(dealApplicationSchema.id, id));
		return this.findById(id);
	}
}
