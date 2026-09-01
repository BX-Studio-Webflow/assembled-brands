import { env } from 'cloudflare:workers';

import { sendTemplateEmail } from '../lib/email-processor.ts';
import { encodeWarmLeadToken } from '../lib/jwt.ts';
import { logger } from '../lib/logger.ts';
import { HubspotContactWebhookRepository } from '../repository/hubspot-contact-webhook.ts';
import { HubspotDealWebhookRepository } from '../repository/hubspot-deal-webhook.ts';
import type { NewHubspotContactWebhook, NewHubspotDealWebhook, NewUser, OnboardingApplication, User } from '../schema/schema.ts';
import { generateSecurePassword } from '../util/string.ts';
import type { HubspotCrmWebhookEvent, HubspotNewLeadBody } from '../web/validator/user.js';
import type { DealApplicationService } from './deal-application.ts';
import type { UserService } from './user.ts';

const HUBSPOT_CONTACTS_URL = 'https://api.hubapi.com/crm/v3/objects/contacts';
const HUBSPOT_DEALS_URL = 'https://api.hubapi.com/crm/v3/objects/deals';
/** Deal properties to request from the HubSpot API */
const DEAL_PROPERTIES = ['dealname', 'amount', 'dealstage', 'pipeline', 'closedate', 'hubspot_owner_id'].join(',');
const DEAL_CREDENTIAL_PROPERTIES = ['application_link', 'application_temporary_password'];

type HubSpotDealWithCredentialProperties = HubSpotDeal & {
	properties: HubSpotDeal['properties'] & {
		application_link?: string | null;
		application_temporary_password?: string | null;
	};
};

/** HubSpot owner email → owner ID. Update via GET /api/v1/hubspot/owners. */
const HUBSPOT_OWNER_EMAIL_TO_ID: Record<string, string> = {
	'michael@assembledbrands.com': '35891474',
	'ethan@assembledbrands.com': '57770135',
	'jackson@bx.studio': '68110406',
	'abby@assembledbrands.com': '76601592',
	'kunal@assembledbrands.com': '77266820',
	'david@bx.studio': '80174606',
	'seton@assembledbrands.com': '81459207',
	'ben@assembledbrands.com': '82801322',
	'brian@bx.studio': '86138627',
	'christian@assembledbrands.com': '93163169',
	'jeff@assembledbrands.com': '128994061',
	'clifford@assembledbrands.com': '340017502',
	'david@assembledbrands.com': '390237470',
	'greg@bellaventure.co': '522917518',
	'anthony@assembledbrands.com': '577268635',
	'deardata@weeklyaccounting.com': '680064922',
	'ann@assembledbrands.com': '1251924788',
};

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

export interface HubSpotDeal {
	id: string;
	properties: {
		dealname: string | null;
		amount: string | null;
		dealstage: string | null;
		pipeline: string | null;
		closedate: string | null;
		hubspot_owner_id: string | null;
		createdate: string;
		lastmodifieddate: string;
		hs_object_id: string;
	};
	createdAt: string;
	updatedAt: string;
	archived: boolean;
}

interface HubSpotAssociationsResponse {
	results: { id: string; type: string }[];
}

const eventToContactRow = (e: HubspotNewLeadBody[number]): NewHubspotContactWebhook => ({
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

const eventToDealRow = (e: HubspotCrmWebhookEvent): NewHubspotDealWebhook => ({
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
	private dealWebhookRepo: HubspotDealWebhookRepository;
	private userService: UserService;
	private dealApplicationService?: DealApplicationService;

	constructor(
		contactWebhookRepo: HubspotContactWebhookRepository,
		dealWebhookRepo: HubspotDealWebhookRepository,
		userService: UserService,
		dealApplicationService?: DealApplicationService,
	) {
		this.contactWebhookRepo = contactWebhookRepo;
		this.dealWebhookRepo = dealWebhookRepo;
		this.userService = userService;
		this.dealApplicationService = dealApplicationService;
		this.apiKey = env.HUBSPOT_API_KEY || '';
		if (!this.apiKey) {
			logger.warn('HubSpot API key not configured');
		}
	}

	/**
	 * Idempotently records a deal webhook event, fetches the deal and its associated
	 * contact from HubSpot, persists everything to the database, and emails the
	 * contact with the warm-lead onboarding link.
	 * @returns The inserted/loaded deal webhook row id.
	 */
	public async processNewDealWebhook(event: HubspotCrmWebhookEvent): Promise<{ rowId: number }> {
		// Idempotency: return early if this event was already recorded
		const existing = await this.dealWebhookRepo.findByPortalEventSubscription(event.portalId, event.eventId, event.subscriptionId);
		if (existing) {
			logger.info({ rowId: existing.id }, 'Deal webhook event already recorded, skipping');
			return { rowId: existing.id };
		}

		const [row] = await this.dealWebhookRepo.create(eventToDealRow(event));
		if (!row) {
			throw new Error('Failed to persist deal webhook event');
		}
		const rowId = row.id;

		logger.info({ objectId: event.objectId, eventId: event.eventId, rowId }, 'HubSpot deal webhook received, fetching deal');

		try {
			// 1. Fetch deal details
			const deal = await this.getDealById(event.objectId);
			const { dealname, amount, dealstage, pipeline, closedate, hubspot_owner_id } = deal.properties;

			// 2. Persist deal properties. Do not mark the row processed until a
			// contact/user/application link is actually provisioned below.
			await this.dealWebhookRepo.update(rowId, {
				deal_name: dealname ?? undefined,
				amount: amount ?? undefined,
				deal_stage: dealstage ?? undefined,
				pipeline: pipeline ?? undefined,
				close_date: closedate ?? undefined,
				hubspot_owner_id: hubspot_owner_id ?? undefined,
			});
			logger.info({ rowId, dealId: deal.id, dealname }, 'Deal logged to database');

			await this.provisionDealCredentialsFromAssociatedContacts({
				rowId,
				dealObjectId: event.objectId,
				dealName: dealname,
			});

			// 4. Disabled (2026-06-29 sync): do NOT auto-email the deal owner on deal
			// creation. Deals are created at the lead/meeting-booked stage before any
			// discovery call, so a creation-time alert is premature noise (this was the
			// email owners like Kunal kept receiving). The owner is still alerted when the
			// applicant actually fills in their warm-lead details (see onboarding-wizard
			// `saveWarmLeadDetails`). No automated email fires when a deal is created.
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			await this.dealWebhookRepo.update(rowId, { status: 'failed', error_message: message });
			throw err;
		}

		return { rowId };
	}

	/**
	 * Recover credentials when a contact is associated after deal.creation.
	 * This is intentionally idempotent and silent: it writes HubSpot deal
	 * properties only when they are missing and never emails the prospect.
	 */
	public async recoverDealCredentialsFromAssociationWebhook(event: HubspotCrmWebhookEvent): Promise<{ rowId: number }> {
		const existing = await this.dealWebhookRepo.findByPortalEventSubscription(event.portalId, event.eventId, event.subscriptionId);
		if (existing) {
			logger.info({ rowId: existing.id }, 'Deal association webhook event already recorded, skipping');
			return { rowId: existing.id };
		}

		const [row] = await this.dealWebhookRepo.create(eventToDealRow(event));
		if (!row) {
			throw new Error('Failed to persist deal association webhook event');
		}
		const rowId = row.id;

		try {
			const deal = (await this.getDealById(event.objectId, [
				'dealname',
				'amount',
				'dealstage',
				'pipeline',
				'closedate',
				'hubspot_owner_id',
				...DEAL_CREDENTIAL_PROPERTIES,
			])) as HubSpotDealWithCredentialProperties;
			const { dealname, amount, dealstage, pipeline, closedate, hubspot_owner_id, application_link, application_temporary_password } =
				deal.properties;

			await this.dealWebhookRepo.update(rowId, {
				deal_name: dealname ?? undefined,
				amount: amount ?? undefined,
				deal_stage: dealstage ?? undefined,
				pipeline: pipeline ?? undefined,
				close_date: closedate ?? undefined,
				hubspot_owner_id: hubspot_owner_id ?? undefined,
			});

			if (application_link && application_temporary_password) {
				await this.dealWebhookRepo.update(rowId, {
					status: 'skipped',
					error_message: 'Application credentials already exist on deal',
				});
				return { rowId };
			}

			await this.provisionDealCredentialsFromAssociatedContacts({
				rowId,
				dealObjectId: event.objectId,
				dealName: dealname,
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			await this.dealWebhookRepo.update(rowId, { status: 'failed', error_message: message });
			throw err;
		}

		return { rowId };
	}

	/**
	 * Fallback for the existing contact.creation subscription: if HubSpot creates
	 * or syncs a contact after a deal already exists, recover any associated deals
	 * that are still missing application credentials. This complements the more
	 * precise deal association-change webhook.
	 */
	public async recoverMissingDealCredentialsForContact(contactObjectId: number): Promise<number> {
		const dealIds = await this.getContactAssociatedDealIds(contactObjectId);
		let recovered = 0;

		for (const dealIdText of dealIds) {
			const dealObjectId = Number(dealIdText);
			if (!Number.isFinite(dealObjectId)) continue;

			const deal = (await this.getDealById(dealObjectId, [
				'dealname',
				...DEAL_CREDENTIAL_PROPERTIES,
			])) as HubSpotDealWithCredentialProperties;

			if (deal.properties.application_link && deal.properties.application_temporary_password) {
				continue;
			}

			const [row] = await this.dealWebhookRepo.findByObjectId(dealObjectId);
			if (!row) {
				logger.warn({ contactObjectId, dealObjectId }, 'Cannot recover deal credentials: no deal webhook row exists');
				continue;
			}

			await this.provisionDealCredentialsFromAssociatedContacts({
				rowId: row.id,
				dealObjectId,
				dealName: deal.properties.dealname,
			});
			recovered += 1;
		}

		if (recovered > 0) {
			logger.info({ contactObjectId, recovered }, 'Recovered missing deal credentials from contact association');
		}
		return recovered;
	}

	public async reconcilePendingDealCredentials(): Promise<{ checked: number; recovered: number }> {
		const pending = await this.dealWebhookRepo.findPendingCredentialRecovery();
		let recovered = 0;

		for (const row of pending) {
			try {
				const deal = (await this.getDealById(row.object_id, [
					'dealname',
					...DEAL_CREDENTIAL_PROPERTIES,
				])) as HubSpotDealWithCredentialProperties;
				if (deal.properties.application_link && deal.properties.application_temporary_password) {
					await this.dealWebhookRepo.update(row.id, {
						status: 'processed',
						error_message: null,
					});
					recovered += 1;
					continue;
				}

				const contactIds = await this.getDealAssociatedContactIds(row.object_id);
				if (contactIds.length === 0) continue;

				await this.provisionDealCredentialsFromAssociatedContacts({
					rowId: row.id,
					dealObjectId: row.object_id,
					dealName: deal.properties.dealname,
				});
				recovered += 1;
			} catch (error) {
				logger.error({ error, dealId: row.object_id, rowId: row.id }, 'Scheduled deal credential recovery failed');
			}
		}

		logger.info({ checked: pending.length, recovered }, 'Scheduled deal credential reconciliation complete');
		return { checked: pending.length, recovered };
	}

	private async provisionDealCredentialsFromAssociatedContacts(params: {
		rowId: number;
		dealObjectId: number;
		dealName: string | null;
	}): Promise<void> {
		const { rowId, dealObjectId, dealName } = params;
		const contactIds = await this.getDealAssociatedContactIds(dealObjectId);
		logger.info({ dealId: dealObjectId, contactCount: contactIds.length }, 'Fetched deal associations');

		if (contactIds.length === 0) {
			await this.dealWebhookRepo.update(rowId, {
				status: 'skipped',
				error_message: 'No associated contacts found; waiting for a contact association event',
			});
			logger.warn({ rowId, dealId: dealObjectId }, 'Deal webhook skipped because no contacts are associated');
			return;
		}

		let primaryContact: { email: string; name: string } | null = null;
		let primaryPassword: string | null = null;
		let primaryUserId: number | null = null;
		let primaryDealApplicationId: number | undefined;

		for (const contactId of contactIds) {
			try {
				const contact = await this.getContactById(Number(contactId));
				const { email, firstname, lastname, phone } = contact.properties;
				if (!email) {
					logger.warn({ contactId }, 'Associated contact has no email, skipping');
					continue;
				}

				let userId: number;
				const existingUser = await this.userService.findByEmail(email);

				if (existingUser) {
					userId = existingUser.id;
					logger.info({ userId, email }, 'User already exists for deal contact');
				} else {
					const password = generateSecurePassword(8);
					const newUser: NewUser = {
						email,
						password,
						role: 'user',
						dial_code: '+1',
						phone: phone || '',
						first_name: firstname || '',
						last_name: lastname || '',
					};
					const [created] = await this.userService.create(newUser);
					if (!created) {
						logger.error({ email }, 'Failed to create user for deal contact');
						continue;
					}
					userId = created.id;
					logger.info({ userId, email }, 'Created user for deal contact');
				}

				let dealApplicationId: number | undefined;
				let applicationPassword: string | null = null;
				if (this.dealApplicationService) {
					const dealApplication = await this.dealApplicationService.createForNewDeal({
						userId,
						hubspotDealObjectId: dealObjectId,
						hubspotDealWebhookEventId: rowId,
						legalName: dealName,
					});
					dealApplicationId = dealApplication.id;
					applicationPassword = await this.dealApplicationService.getOrCreateTemporaryPassword(dealApplication.id);
				}

				if (!primaryContact) {
					primaryContact = { email, name: firstname || 'Contact' };
					primaryPassword = applicationPassword;
					primaryUserId = userId;
					primaryDealApplicationId = dealApplicationId;
				}

				// Disabled: do not auto-email prospects when deals are created internally in HubSpot.
				// Application links should only go out when the team sends them manually.
				// await this.sendWarmLeadInvite(email, firstname || 'there', dealName, dealObjectId);
			} catch (contactErr) {
				logger.error({ contactId, err: contactErr }, 'Failed to process deal contact');
			}
		}

		if (!primaryContact || !primaryPassword || primaryUserId == null) {
			await this.dealWebhookRepo.update(rowId, {
				status: 'skipped',
				error_message: 'No associated contacts with usable email/password found',
			});
			return;
		}

		const webAppUrl = env.WEBAPP_URL || 'https://webapp-omega-rosy.vercel.app';
		const token = await encodeWarmLeadToken(dealObjectId, null);
		const applicationLink = `${webAppUrl}/apply?token=${encodeURIComponent(token)}`;
		await this.setDealApplicationCredentials(dealObjectId, applicationLink, primaryPassword);

		await this.dealWebhookRepo.update(rowId, {
			user_id: primaryUserId,
			...(primaryDealApplicationId != null ? { deal_application_id: primaryDealApplicationId } : {}),
			status: 'processed',
			error_message: null,
		});
		logger.info({ rowId, dealId: dealObjectId, email: primaryContact.email }, 'Application credentials written to HubSpot deal');
	}

	/**
	 * Updates deal properties on HubSpot using PATCH /crm/v3/objects/deals/{id}.
	 *
	 * Property mapping (warm-lead form → HubSpot):
	 *  - legal_name            → dealname      ("Deal Name")
	 *  - incorporation_state        → hq_state          ("HQ State")
	 *  - net_revenue_last_12_months → annual_revenue     ("Annual Revenue")
	 *  - ownerEmail                 → hubspot_owner_id   ("Deal Owner") — resolved via static map
	 */
	public async updateDeal(
		dealObjectId: number,
		fields: {
			dealname?: string;
			hq_state?: string;
			annual_revenue?: string;
			ownerEmail?: string;
		},
	): Promise<void> {
		if (!this.apiKey) {
			throw new Error('HubSpot API key not configured');
		}

		const properties: Record<string, string> = {};
		if (fields.dealname) properties.dealname = fields.dealname;
		if (fields.hq_state) properties.hq_state = fields.hq_state;
		if (fields.annual_revenue) properties.annual_revenue = fields.annual_revenue;

		if (fields.ownerEmail) {
			const ownerId = this.getOwnerIdByEmail(fields.ownerEmail);
			if (ownerId) {
				properties.hubspot_owner_id = ownerId;
			} else {
				logger.warn({ ownerEmail: fields.ownerEmail }, 'No HubSpot owner ID found for email, skipping owner assignment');
			}
		}

		if (Object.keys(properties).length === 0) return;

		const response = await fetch(`${HUBSPOT_DEALS_URL}/${dealObjectId}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.apiKey}`,
			},
			body: JSON.stringify({ properties }),
		});

		if (!response.ok) {
			const error = await response.json();
			logger.error({ error, dealObjectId }, 'HubSpot deal update failed');
			throw new Error(`HubSpot deal update error: ${JSON.stringify(error)}`);
		}

		logger.info({ dealObjectId, fields: Object.keys(properties) }, 'HubSpot deal updated');
	}

	/**
	 * Writes the applicant's portal link + temporary password onto the HubSpot deal
	 * as custom properties so the originator can copy them into a manual outreach
	 * email. Additive PATCH — touches ONLY these two properties:
	 *  - application_link               ("Application Link")
	 *  - application_temporary_password ("Application Temporary Password")
	 */
	public async setDealApplicationCredentials(dealObjectId: number, applicationLink: string, temporaryPassword: string): Promise<void> {
		if (!this.apiKey) {
			throw new Error('HubSpot API key not configured');
		}

		const response = await fetch(`${HUBSPOT_DEALS_URL}/${dealObjectId}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.apiKey}`,
			},
			body: JSON.stringify({
				properties: {
					application_link: applicationLink,
					application_temporary_password: temporaryPassword,
				},
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			logger.error({ error, dealObjectId }, 'HubSpot deal application-credentials update failed');
			throw new Error(`HubSpot deal application-credentials update error: ${JSON.stringify(error)}`);
		}

		logger.info({ dealObjectId }, 'Application link + temp password written to HubSpot deal');
	}

	/**
	 * Updates only the HubSpot deal stage via PATCH /crm/v3/objects/deals/{id}.
	 */
	public async updateDealStage(dealObjectId: number, dealStage: string): Promise<void> {
		if (!this.apiKey) {
			throw new Error('HubSpot API key not configured');
		}

		const response = await fetch(`${HUBSPOT_DEALS_URL}/${dealObjectId}`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.apiKey}`,
			},
			body: JSON.stringify({
				properties: {
					dealstage: dealStage,
				},
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			logger.error({ error, dealObjectId, dealStage }, 'HubSpot deal stage update failed');
			throw new Error(`HubSpot deal stage update error: ${JSON.stringify(error)}`);
		}

		logger.info({ dealObjectId, dealStage }, 'HubSpot deal stage updated');
	}

	/**
	 * Returns up to 100 HubSpot portal owners.
	 */
	public async getOwners(): Promise<{ results: { id: string; email: string; firstName: string; lastName: string }[] }> {
		if (!this.apiKey) {
			throw new Error('HubSpot API key not configured');
		}
		const response = await fetch('https://api.hubapi.com/crm/v3/owners?limit=100', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.apiKey}`,
			},
		});
		if (!response.ok) {
			const error = await response.json();
			logger.error({ error }, 'HubSpot owners API error');
			throw new Error(`HubSpot owners API error: ${JSON.stringify(error)}`);
		}
		return response.json() as Promise<{ results: { id: string; email: string; firstName: string; lastName: string }[] }>;
	}

	/**
	 * Returns HubSpot deal pipelines from GET /crm/v3/pipelines/deals.
	 */
	public async getDealPipelines(): Promise<unknown> {
		if (!this.apiKey) {
			throw new Error('HubSpot API key not configured');
		}
		const response = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.apiKey}`,
			},
		});
		if (!response.ok) {
			const error = await response.json();
			logger.error({ error }, 'HubSpot deal pipelines API error');
			throw new Error(`HubSpot deal pipelines API error: ${JSON.stringify(error)}`);
		}
		return response.json() as Promise<unknown>;
	}

	/**
	 * Resolves a HubSpot owner ID from email using a pre-fetched static map.
	 * Update this map by calling GET /api/v1/hubspot/owners.
	 * @returns The owner's HubSpot ID string, or null if not found.
	 */
	public getOwnerIdByEmail(email: string): string | null {
		return HUBSPOT_OWNER_EMAIL_TO_ID[email.toLowerCase()] ?? null;
	}

	public getOwnerEmailById(ownerId: string): string | null {
		const entry = Object.entries(HUBSPOT_OWNER_EMAIL_TO_ID).find(([, id]) => id === ownerId);
		return entry?.[0] ?? null;
	}

	/**
	 * Resolves a HubSpot owner by ID using the static map, then the Owners API as fallback.
	 */
	public async resolveOwner(ownerId: string): Promise<{ email: string; firstName: string } | null> {
		const staticEmail = this.getOwnerEmailById(ownerId);
		if (staticEmail) {
			return { email: staticEmail, firstName: staticEmail.split('@')[0] ?? 'there' };
		}

		if (!this.apiKey) {
			logger.warn({ ownerId }, 'HubSpot API key not configured; cannot resolve owner email');
			return null;
		}

		const response = await fetch(`https://api.hubapi.com/crm/v3/owners/${ownerId}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.apiKey}`,
			},
		});

		if (!response.ok) {
			const error = await response.json();
			logger.warn({ error, ownerId }, 'HubSpot owner lookup failed');
			return null;
		}

		const owner = (await response.json()) as { email: string; firstName?: string };
		if (!owner.email) {
			return null;
		}

		return { email: owner.email, firstName: owner.firstName || owner.email.split('@')[0] || 'there' };
	}

	/**
	 * Finds the most recent processed deal webhook row for a given HubSpot deal object ID.
	 * Returns the row (including user_id) or null if not found / not yet processed.
	 */
	public async findProcessedDealByObjectId(dealObjectId: number) {
		return this.dealWebhookRepo.findProcessedByDealObjectId(dealObjectId);
	}

	public async findProcessedDealByUserId(userId: number) {
		return this.dealWebhookRepo.findProcessedByUserId(userId);
	}

	public async findDealApplicationById(dealApplicationId: number) {
		return this.dealApplicationService?.findById(dealApplicationId) ?? null;
	}

	/**
	 * Returns the HubSpot contact IDs associated with a deal.
	 * Uses the CRM associations endpoint: GET /crm/v3/objects/deals/{id}/associations/contacts
	 */
	public async getDealAssociatedContactIds(dealId: number): Promise<string[]> {
		if (!this.apiKey) {
			throw new Error('HubSpot API key not configured');
		}
		const url = `${HUBSPOT_DEALS_URL}/${dealId}/associations/contacts`;
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.apiKey}`,
			},
		});
		if (!response.ok) {
			const error = await response.json();
			logger.error({ error }, 'HubSpot associations API error');
			throw new Error(`HubSpot associations API error: ${JSON.stringify(error)}`);
		}
		const data = (await response.json()) as HubSpotAssociationsResponse;
		return data.results.map((r) => r.id);
	}

	private async getContactAssociatedDealIds(contactId: number): Promise<string[]> {
		if (!this.apiKey) {
			throw new Error('HubSpot API key not configured');
		}
		const url = `${HUBSPOT_CONTACTS_URL}/${contactId}/associations/deals`;
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.apiKey}`,
			},
		});
		if (!response.ok) {
			const error = await response.json();
			logger.error({ error }, 'HubSpot contact associations API error');
			throw new Error(`HubSpot contact associations API error: ${JSON.stringify(error)}`);
		}
		const data = (await response.json()) as HubSpotAssociationsResponse;
		return data.results.map((r) => r.id);
	}

	/**
	 * Sends an underwriting alert to the deal owner when a warm inbound deal is created or assigned.
	 */
	private async sendSlackUnderwritingAlert(params: {
		dealLabel: string;
		dealObjectId: number;
		contactLabel: string;
		ownerEmail?: string;
		hubspotDealLink?: string;
	}): Promise<boolean> {
		if (env.SLACK_NOTIFICATIONS_ENABLED === 'false') {
			logger.info({ dealObjectId: params.dealObjectId }, 'Slack underwriting alert skipped by flag');
			return false;
		}

		const text = [
			`New warm inbound application: ${params.dealLabel}`,
			`Contact: ${params.contactLabel}`,
			params.ownerEmail ? `Owner: ${params.ownerEmail}` : undefined,
			params.hubspotDealLink ? `HubSpot: ${params.hubspotDealLink}` : undefined,
		]
			.filter(Boolean)
			.join('\n');

		if (env.SLACK_NOTIFICATION_WEBHOOK_URL) {
			const response = await fetch(env.SLACK_NOTIFICATION_WEBHOOK_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text }),
			});
			if (!response.ok) {
				throw new Error(`Slack webhook error: ${response.status} ${await response.text()}`);
			}
			logger.info({ dealObjectId: params.dealObjectId }, 'Slack underwriting alert sent via webhook');
			return true;
		}

		if (env.SLACK_BOT_TOKEN && env.SLACK_CHANNEL_ID) {
			const response = await fetch('https://slack.com/api/chat.postMessage', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
					Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`,
				},
				body: JSON.stringify({
					channel: env.SLACK_CHANNEL_ID,
					text,
				}),
			});
			const result = (await response.json()) as { ok?: boolean; error?: string };
			if (!response.ok || !result.ok) {
				throw new Error(`Slack API error: ${result.error || response.status}`);
			}
			logger.info({ dealObjectId: params.dealObjectId }, 'Slack underwriting alert sent via bot');
			return true;
		}

		logger.warn({ dealObjectId: params.dealObjectId }, 'Slack underwriting alert skipped: no Slack destination configured');
		return false;
	}

	public async sendSubmissionUnderwritingAlerts(dealApplicationId: number): Promise<{ emailSent: boolean; slackSent: boolean }> {
		if (!this.dealApplicationService) {
			throw new Error('Deal application service not configured');
		}
		const application = await this.dealApplicationService.findById(dealApplicationId);
		if (!application) {
			return { emailSent: false, slackSent: false };
		}
		const emailRecipients = (env.UNDERWRITING_ALERT_EMAILS ?? '')
			.split(',')
			.map((email) => email.trim())
			.filter(Boolean);
		const shouldSendEmail =
			!application.underwriting_email_sent_at && env.UNDERWRITING_ALERT_EMAILS_ENABLED !== 'false' && emailRecipients.length > 0;
		const shouldSendSlack = !application.slack_alert_sent_at;
		if (!shouldSendEmail && !shouldSendSlack) {
			return { emailSent: false, slackSent: false };
		}

		const dealObjectId = application.hubspot_deal_object_id;
		const [deal, dealRow, contactIds] = await Promise.all([
			this.getDealById(dealObjectId, ['dealname']),
			this.findProcessedDealByObjectId(dealObjectId),
			this.getDealAssociatedContactIds(dealObjectId),
		]);
		const contact = contactIds[0] ? await this.getContactById(Number(contactIds[0])) : null;
		const contactName = [contact?.properties.firstname, contact?.properties.lastname].filter(Boolean).join(' ').trim();
		const contactLabel = contact?.properties.email
			? contactName
				? `${contactName} (${contact.properties.email})`
				: contact.properties.email
			: 'Applicant';
		const hubspotDealLink = dealRow?.portal_id ? `https://app.hubspot.com/contacts/${dealRow.portal_id}/deal/${dealObjectId}` : undefined;
		const dealLabel = deal.properties.dealname ?? application.legal_name ?? `Deal #${dealObjectId}`;
		const emailResults = shouldSendEmail
			? await Promise.allSettled(
					emailRecipients.map((recipient) =>
						sendTemplateEmail(recipient, 'Underwriting team', env.TRANSACTIONAL_EMAIL_TEMPLATE_ID, {
							subject: `New warm inbound deal: ${dealLabel}`,
							title: 'New warm inbound application',
							subtitle: 'Assembled Brands - Underwriting Alert',
							name: 'Underwriting team',
							body: `A warm inbound applicant has submitted their application.\n\nDeal: ${dealLabel}\nContact: ${contactLabel}`,
							buttonText: hubspotDealLink ? 'View deal in HubSpot' : '',
							buttonLink: hubspotDealLink ?? '',
						}),
					),
				)
			: [];
		const emailSent = shouldSendEmail && emailResults.every((result) => result.status === 'fulfilled');
		for (const [index, result] of emailResults.entries()) {
			if (result.status === 'rejected') {
				logger.error({ error: result.reason, recipient: emailRecipients[index], dealObjectId }, 'Submission underwriting email failed');
			}
		}
		if (emailSent) {
			await this.dealApplicationService.markUnderwritingEmailSent(application.id);
		}

		const slackSent = shouldSendSlack
			? await this.sendSlackUnderwritingAlert({
					dealLabel,
					dealObjectId,
					contactLabel,
					hubspotDealLink,
				})
			: false;
		if (slackSent) {
			await this.dealApplicationService.markSlackAlertSent(application.id);
		}
		return { emailSent, slackSent };
	}

	/**
	 * Sends the warm-lead onboarding invite email to a deal contact.
	 */
	private async sendWarmLeadInvite(email: string, firstName: string, dealName: string | null, dealId: number): Promise<void> {
		// Password-less deep link: a signed token carries the deal so the applicant
		// lands straight in the new app (no portal, deal id, or password).
		const webAppUrl = env.WEBAPP_URL || 'https://webapp-omega-rosy.vercel.app';
		const startToken = await encodeWarmLeadToken(dealId);
		const startUrl = `${webAppUrl}/apply?token=${encodeURIComponent(startToken)}`;

		await sendTemplateEmail(email, firstName, env.TRANSACTIONAL_EMAIL_TEMPLATE_ID, {
			subject: "You've been invited to apply to Assembled Brands",
			title: 'Complete your profile',
			// Customer-facing eyebrow — keep free of internal CRM/pipeline terms.
			subtitle: 'Assembled Brands - Application Portal',
			name: firstName,
			body: `Hi ${firstName}, we have received a referral for you${dealName ? ` (${dealName})` : ''}. Please click the button below to fill in your company profile and start your application with Assembled Brands.`,
			buttonText: 'Start my application',
			buttonLink: startUrl,
		});
		logger.info({ email, dealId }, 'Warm-lead invite sent');
	}

	/**
	 * Fetches a deal by its HubSpot object ID.
	 * @param {number} id - HubSpot deal object ID
	 * @param {string[]} [properties] - Optional HubSpot deal properties to request
	 */
	public async getDealById(id: number, properties?: string[]): Promise<HubSpotDeal> {
		if (!this.apiKey) {
			throw new Error('HubSpot API key not configured');
		}
		const requestedProperties = properties?.length ? properties.join(',') : DEAL_PROPERTIES;
		const url = `${HUBSPOT_DEALS_URL}/${id}?properties=${requestedProperties}`;
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.apiKey}`,
			},
		});
		if (!response.ok) {
			const error = await response.json();
			logger.error({ error }, 'HubSpot deals API error');
			throw new Error(`HubSpot deals API error: ${JSON.stringify(error)}`);
		}
		const result = (await response.json()) as HubSpotDeal;
		logger.info({ dealId: result.id }, 'Deal fetched from HubSpot');
		return result;
	}

	/**
	 * Insert or load a DB row for the first webhook event only (idempotent per portal/event/subscription).
	 */
	public async recordOrLoadContactWebhookEvent(event: HubspotNewLeadBody[number]): Promise<{ id: number }> {
		const existing = await this.contactWebhookRepo.findByPortalEventSubscription(event.portalId, event.eventId, event.subscriptionId);
		if (existing) {
			return { id: existing.id };
		}
		const [inserted] = await this.contactWebhookRepo.create(eventToContactRow(event));
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
			const response = await fetch(HUBSPOT_CONTACTS_URL, {
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
			const response = await fetch(`${HUBSPOT_CONTACTS_URL}/${id}`, {
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
