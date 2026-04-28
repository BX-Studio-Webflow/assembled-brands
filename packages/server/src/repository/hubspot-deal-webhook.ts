import { and, desc, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import { hubspotDealWebhookSchema, type NewHubspotDealWebhook, type schema } from '../schema/schema.js';

export class HubspotDealWebhookRepository {
	private db: DrizzleD1Database<typeof schema>;

	constructor(db: DrizzleD1Database<typeof schema>) {
		this.db = db;
	}

	public async create(data: NewHubspotDealWebhook) {
		return this.db.insert(hubspotDealWebhookSchema).values(data).returning();
	}

	public async findById(id: number) {
		return this.db.query.hubspotDealWebhookSchema.findFirst({
			where: eq(hubspotDealWebhookSchema.id, id),
		});
	}

	public async findByObjectId(objectId: number) {
		return this.db.query.hubspotDealWebhookSchema.findMany({
			where: eq(hubspotDealWebhookSchema.object_id, objectId),
			orderBy: [desc(hubspotDealWebhookSchema.created_at)],
		});
	}

	/** Idempotency key matches HubSpot re-delivery behaviour (portal + event + subscription). */
	public async findByPortalEventSubscription(portalId: number, eventId: number, subscriptionId: number) {
		return this.db.query.hubspotDealWebhookSchema.findFirst({
			where: and(
				eq(hubspotDealWebhookSchema.portal_id, portalId),
				eq(hubspotDealWebhookSchema.event_id, eventId),
				eq(hubspotDealWebhookSchema.subscription_id, subscriptionId),
			),
		});
	}

	public async update(id: number, data: Partial<NewHubspotDealWebhook>) {
		return this.db.update(hubspotDealWebhookSchema).set(data).where(eq(hubspotDealWebhookSchema.id, id));
	}

	/**
	 * Find the most recent processed deal row for a given HubSpot deal object ID.
	 * Used to resolve the platform user associated with an incoming warm-lead form.
	 * @param {number} objectId - HubSpot deal object ID
	 */
	public async findProcessedByDealObjectId(objectId: number) {
		return this.db.query.hubspotDealWebhookSchema.findFirst({
			where: and(eq(hubspotDealWebhookSchema.object_id, objectId), eq(hubspotDealWebhookSchema.status, 'processed')),
			orderBy: [desc(hubspotDealWebhookSchema.created_at)],
		});
	}

	public async findProcessedByUserId(userId: number) {
		return this.db.query.hubspotDealWebhookSchema.findFirst({
			where: and(eq(hubspotDealWebhookSchema.user_id, userId), eq(hubspotDealWebhookSchema.status, 'processed')),
			orderBy: [desc(hubspotDealWebhookSchema.created_at)],
		});
	}

	public async delete(id: number) {
		return this.db.delete(hubspotDealWebhookSchema).where(eq(hubspotDealWebhookSchema.id, id));
	}
}
