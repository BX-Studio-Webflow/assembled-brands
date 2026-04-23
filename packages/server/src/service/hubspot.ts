import { env } from 'cloudflare:workers';

import { logger } from '../lib/logger.ts';
import { HubspotContactWebhookRepository } from '../repository/hubspot-contact-webhook.ts';
import type { NewHubspotContactWebhook, OnboardingApplication, User } from '../schema/schema.ts';
import type { HubspotNewLeadBody } from '../web/validator/user.js';

const HUBSPOT_API_URL = 'https://api.hubapi.com/crm/v3/objects/contacts';

export interface HubSpotContactProperties {
	email: string;
	firstname?: string;
	lastname?: string;
	phone?: string;
	website?: string;
	company?: string;
}

export interface HubSpotContact {
	id: string;
	properties: {
		firstname: string;
		lastname: string;
		email: string;
		phone: string;
		company: string;
		website: string;
		jobtitle: string;
		lifecyclestage: string;
		hs_lead_status: string;
		hubspot_owner_id: string;
		createdate: string;
		lastmodifieddate: string;
		hs_object_id: string;
	};
	createdAt: string;
	updatedAt: string;
	archived: boolean;
}

const newLeadEventToRow = (e: HubspotNewLeadBody[number]): NewHubspotContactWebhook => ({
	app_id: e.appId,
	event_id: e.eventId,
	subscription_id: e.subscriptionId,
	portal_id: e.portalId,
	occurred_at: e.occurredAt,
	subscription_type: e.subscriptionType,
	attempt_number: e.attemptNumber,
	object_id: e.objectId,
	change_source: e.changeSource,
	change_flag: e.changeFlag,
});

/**
 * Service class for managing HubSpot CRM operations
 */
export class HubSpotService {
	private apiKey: string;
	private contactWebhookRepo: HubspotContactWebhookRepository;

	constructor(contactWebhookRepo: HubspotContactWebhookRepository) {
		this.contactWebhookRepo = contactWebhookRepo;
		this.apiKey = env.HUBSPOT_API_KEY || '';
		if (!this.apiKey) {
			logger.warn('HubSpot API key not configured');
		}
	}

	/**
	 * Insert or load a DB row for the first webhook event only (idempotent per portal/event/subscription).
	 */
	public async recordOrLoadContactWebhookEvent(event: HubspotNewLeadBody[number]): Promise<{ id: number }> {
		const existing = await this.contactWebhookRepo.findByPortalEventSubscription(event.portalId, event.eventId, event.subscriptionId);
		if (existing) {
			return { id: existing.id };
		}
		const [inserted] = await this.contactWebhookRepo.create(newLeadEventToRow(event));
		if (!inserted) {
			throw new Error('Failed to persist webhook event');
		}
		return { id: inserted.id };
	}

	/**
	 * True when this row was already fully processed and linked to a user.
	 */
	public async isContactWebhookAlreadyProcessed(webhookRowId: number): Promise<boolean> {
		const rec = await this.contactWebhookRepo.findById(webhookRowId);
		return rec?.status === 'processed' && rec.user_id != null;
	}

	/** @param {string} message - Failure reason (stored on row) */
	public async markContactWebhookFailed(webhookRowId: number, message: string) {
		return this.contactWebhookRepo.update(webhookRowId, { status: 'failed', error_message: message });
	}

	/** @param {string} message - Skip reason (e.g. duplicate user) */
	public async markContactWebhookSkipped(webhookRowId: number, message: string) {
		return this.contactWebhookRepo.update(webhookRowId, { status: 'skipped', error_message: message });
	}

	/** After user creation and welcome email, mark the webhook row processed and link the user. */
	public async markContactWebhookProcessedForNewUser(webhookRowId: number, userId: number) {
		return this.contactWebhookRepo.update(webhookRowId, {
			status: 'processed',
			user_id: userId,
			error_message: null,
		});
	}

	public async markContactWebhookError(webhookRowId: number, err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return this.contactWebhookRepo.update(webhookRowId, { status: 'failed', error_message: message });
	}

	/**
	 * Creates or updates a contact in HubSpot
	 * @param {HubSpotContactProperties} properties - Contact properties to send
	 * @returns {Promise<{id: string}>} HubSpot contact ID
	 * @throws {Error} When HubSpot API call fails
	 */
	public async createContact(properties: HubSpotContactProperties): Promise<{ id: string }> {
		if (!this.apiKey) {
			logger.warn('HubSpot API key not configured, skipping contact creation');
			throw new Error('HubSpot API key not configured');
		}

		try {
			const response = await fetch(HUBSPOT_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify({
					properties: properties,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				logger.error({ error }, 'HubSpot API error');
				throw new Error(`HubSpot API error: ${JSON.stringify(error)}`);
			}

			const result = (await response.json()) as { id: string };
			logger.info(`Contact created/updated in HubSpot: ${result.id}`);
			return result;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Creates or updates a contact in HubSpot
	 * @param {HubSpotContactProperties} properties - Contact properties to send
	 * @returns {Promise<{id: string}>} HubSpot contact ID
	 * @throws {Error} When HubSpot API call fails
	 */
	public async getContactById(id: number): Promise<HubSpotContact> {
		if (!this.apiKey) {
			logger.warn('HubSpot API key not configured, skipping contact creation');
			throw new Error('HubSpot API key not configured');
		}

		try {
			const response = await fetch(`${HUBSPOT_API_URL}/${id}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.apiKey}`,
				},
			});

			if (!response.ok) {
				const error = await response.json();
				logger.error({ error }, 'HubSpot API error');
				throw new Error(`HubSpot API error: ${JSON.stringify(error)}`);
			}

			const result = (await response.json()) as HubSpotContact;
			logger.info(`Contact fetched from HubSpot: ${result.id}`);
			return result;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Sends disqualified lead data to HubSpot
	 * @param {User} user - User data
	 * @param {OnboardingApplication} application - Onboarding application data
	 * @returns {Promise<{id: string}>} HubSpot contact ID
	 * @throws {Error} When HubSpot API call fails
	 */
	public async sendDisqualifiedLead(user: User, application: OnboardingApplication): Promise<{ id: string }> {
		const properties: HubSpotContactProperties = {
			email: user.email,
			firstname: user.first_name || 'None',
			lastname: user.last_name || 'None',
			phone: user.phone || undefined,
			website: application.website || undefined,
			company: application.legal_name || undefined,
		};

		// Remove undefined values
		Object.keys(properties).forEach((key) => {
			if (properties[key as keyof HubSpotContactProperties] === undefined) {
				delete properties[key as keyof HubSpotContactProperties];
			}
		});

		return this.createContact(properties);
	}
}
