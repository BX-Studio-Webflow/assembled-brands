import { and, desc, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import { hubspotContactWebhookSchema, type NewHubspotContactWebhook, type schema } from '../schema/schema.js';

/**
 * Repository for HubSpot contact webhook events
 */
export class HubspotContactWebhookRepository {
	private db: DrizzleD1Database<typeof schema>;

	/**
	 * @param {DrizzleD1Database<typeof schema>} db - Database instance
	 */
	constructor(db: DrizzleD1Database<typeof schema>) {
		this.db = db;
	}

	/**
	 * Insert a webhook event row
	 * @param {NewHubspotContactWebhook} data - Row payload
	 * @returns {Promise<HubspotContactWebhook[]>} Inserted row(s)
	 */
	public async create(data: NewHubspotContactWebhook) {
		return this.db.insert(hubspotContactWebhookSchema).values(data).returning();
	}

	/**
	 * Find by primary key
	 * @param {number} id - Row id
	 */
	public async findById(id: number) {
		return this.db.query.hubspotContactWebhookSchema.findFirst({
			where: eq(hubspotContactWebhookSchema.id, id),
		});
	}

	/**
	 * Find events for a HubSpot object (contact) id, newest first
	 * @param {number} objectId - HubSpot object id
	 */
	public async findByObjectId(objectId: number) {
		return this.db.query.hubspotContactWebhookSchema.findMany({
			where: eq(hubspotContactWebhookSchema.object_id, objectId),
			orderBy: [desc(hubspotContactWebhookSchema.created_at)],
		});
	}

	/**
	 * Idempotency: same delivery key as HubSpot (portal + event + subscription)
	 */
	public async findByPortalEventSubscription(portalId: number, eventId: number, subscriptionId: number) {
		return this.db.query.hubspotContactWebhookSchema.findFirst({
			where: and(
				eq(hubspotContactWebhookSchema.portal_id, portalId),
				eq(hubspotContactWebhookSchema.event_id, eventId),
				eq(hubspotContactWebhookSchema.subscription_id, subscriptionId),
			),
		});
	}

	/**
	 * Update a row
	 * @param {number} id - Row id
	 * @param {Partial<NewHubspotContactWebhook>} data - Fields to update
	 */
	public async update(id: number, data: Partial<NewHubspotContactWebhook>) {
		return this.db.update(hubspotContactWebhookSchema).set(data).where(eq(hubspotContactWebhookSchema.id, id));
	}

	/**
	 * Delete a row
	 * @param {number} id - Row id
	 */
	public async delete(id: number) {
		return this.db.delete(hubspotContactWebhookSchema).where(eq(hubspotContactWebhookSchema.id, id));
	}
}
