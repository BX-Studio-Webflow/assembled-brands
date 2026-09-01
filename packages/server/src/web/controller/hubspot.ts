import type { Context } from 'hono';

import { logger } from '../../lib/logger.js';
import type { NewUser } from '../../schema/schema.ts';
import type { HubSpotService } from '../../service/hubspot.js';
import type { UserService } from '../../service/user.js';
import { generateSecurePassword } from '../../util/string.ts';
import { hubspotCrmWebhookEventSchema } from '../validator/user.js';
import { getErrorPhrase } from '../validator/validator.js';
import { serveBadRequest, serveInternalServerError, serveUnprocessableEntity } from './resp/error.js';

export const isDealCredentialRecoveryEvent = (subscriptionType: string): boolean =>
	[
		'deal.associationChange',
		'deal.contactAssociationChange',
		'deal.association.change',
		'deal.contactAssociation.change',
		'deal.propertyChange',
	].includes(subscriptionType) || subscriptionType.startsWith('deal.association');

export class HubSpotController {
	private hubSpotService: HubSpotService;
	private userService: UserService;

	constructor(hubSpotService: HubSpotService, userService: UserService) {
		this.hubSpotService = hubSpotService;
		this.userService = userService;
	}

	/**
	 * Single inbound webhook for all HubSpot CRM subscriptions.
	 * Routes to the correct handler based on `subscriptionType`.
	 *
	 * Supported types:
	 *  - contact.creation → provision a new platform user
	 *  - deal.creation    → record / process the new deal
	 *  - deal association changes → recover credentials if contact is attached later
	 *
	 * Register in HubSpot as: POST /api/v1/hubspot/webhook
	 */
	public handleWebhook = async (c: Context) => {
		try {
			const raw = await c.req.json();
			const parsed = hubspotCrmWebhookEventSchema.array().safeParse(raw);
			if (!parsed.success) {
				return serveUnprocessableEntity(c, getErrorPhrase(parsed.error));
			}
			const events = parsed.data;
			if (events.length === 0) {
				return serveBadRequest(c, 'At least one webhook event is required');
			}

			const first = events[0]!;
			logger.info({ subscriptionType: first.subscriptionType, objectId: first.objectId, eventId: first.eventId });

			switch (first.subscriptionType) {
				case 'contact.creation':
					return this.handleContactCreation(c, first);
				case 'deal.creation':
					return this.handleDealCreation(c, first);
				default:
					if (this.isDealAssociationChange(first.subscriptionType)) {
						return this.handleDealAssociationChange(c, first);
					}
					logger.warn({ subscriptionType: first.subscriptionType }, 'Unhandled HubSpot subscription type');
					return c.json({ message: `Unhandled subscription type: ${first.subscriptionType}` });
			}
		} catch (err) {
			logger.error(err);
			return serveInternalServerError(c, err);
		}
	};

	private handleContactCreation = async (
		c: Context,
		event: { objectId: number; eventId: number; portalId: number; subscriptionId: number },
	) => {
		let webhookRowId: number;
		try {
			const recorded = await this.hubSpotService.recordOrLoadContactWebhookEvent(
				event as Parameters<HubSpotService['recordOrLoadContactWebhookEvent']>[0],
			);
			webhookRowId = recorded.id;
		} catch (err) {
			return serveInternalServerError(c, err);
		}

		if (await this.hubSpotService.isContactWebhookAlreadyProcessed(webhookRowId)) {
			return c.json({ message: 'Webhook event already processed' });
		}

		try {
			const { objectId } = event;
			if (!objectId) {
				await this.hubSpotService.markContactWebhookFailed(webhookRowId, 'Missing objectId');
				return serveBadRequest(c, 'Object ID is required in the webhook payload');
			}

			const contactDetails = await this.hubSpotService.getContactById(objectId);
			if (!contactDetails) {
				await this.hubSpotService.markContactWebhookFailed(webhookRowId, 'Contact details not found');
				return serveBadRequest(c, 'Contact details not found');
			}

			const { email, firstname, lastname, phone } = contactDetails.properties;
			const existingUser = await this.userService.findByEmail(email);
			if (existingUser) {
				await this.hubSpotService.markContactWebhookSkipped(webhookRowId, 'User already exists');
				await this.recoverMissingDealCredentialsForContact(objectId);
				return c.json({ message: 'User already exists' });
			}

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
			const [createdUser] = await this.userService.create(newUser);
			if (!createdUser) {
				await this.hubSpotService.markContactWebhookFailed(webhookRowId, 'Failed to create user');
				return c.json({ message: 'Failed to create user', code: 'FAILED_TO_CREATE_USER' }, 400);
			}

			// Per product decision (2026-06-29): no automatic email is sent to prospects
			// when a contact/deal is created in HubSpot. The application link + temporary
			// password are surfaced as HubSpot deal properties for the originator to send
			// manually after their discovery call. The only prospect-facing automated email
			// is the post-submission confirmation. Account is still provisioned here.
			void password;

			await this.hubSpotService.markContactWebhookProcessedForNewUser(webhookRowId, createdUser.id);
			await this.recoverMissingDealCredentialsForContact(objectId);
			return c.json({ message: 'User created successfully, please check your email for your verification code' });
		} catch (err) {
			await this.hubSpotService.markContactWebhookError(webhookRowId, err);
			return serveInternalServerError(c, err);
		}
	};

	private recoverMissingDealCredentialsForContact = async (contactObjectId: number) => {
		try {
			await this.hubSpotService.recoverMissingDealCredentialsForContact(contactObjectId);
		} catch (err) {
			logger.error({ err, contactObjectId }, 'Failed to recover deal credentials from contact webhook (non-fatal)');
		}
	};

	private handleDealCreation = async (c: Context, event: Parameters<HubSpotService['processNewDealWebhook']>[0]) => {
		await this.hubSpotService.processNewDealWebhook(event);
		return c.json({ message: 'Deal webhook processed' });
	};

	private handleDealAssociationChange = async (
		c: Context,
		event: Parameters<HubSpotService['recoverDealCredentialsFromAssociationWebhook']>[0],
	) => {
		await this.hubSpotService.recoverDealCredentialsFromAssociationWebhook(event);
		return c.json({ message: 'Deal association webhook processed' });
	};

	private isDealAssociationChange(subscriptionType: string) {
		return isDealCredentialRecoveryEvent(subscriptionType);
	}

	/** Proxies GET /crm/v3/owners?limit=100 from HubSpot. */
	public getOwners = async (c: Context) => {
		try {
			const owners = await this.hubSpotService.getOwners();
			return c.json(owners);
		} catch (err) {
			logger.error(err);
			return serveInternalServerError(c, err);
		}
	};

	/** Proxies GET /crm/v3/pipelines/deals from HubSpot. */
	public getDealPipelines = async (c: Context) => {
		try {
			const pipelines = await this.hubSpotService.getDealPipelines();
			return c.json(pipelines);
		} catch (err) {
			logger.error(err);
			return serveInternalServerError(c, err);
		}
	};

	/** Proxies GET /crm/v3/objects/deals/:id from HubSpot. */
	public getDealById = async (c: Context) => {
		try {
			const dealIdParam = c.req.param('id');
			const dealId = Number(dealIdParam);
			if (!Number.isInteger(dealId) || dealId <= 0) {
				return serveBadRequest(c, 'Invalid deal id');
			}

			const propertiesParam = c.req.query('properties');
			const properties = propertiesParam
				?.split(',')
				.map((prop) => prop.trim())
				.filter(Boolean);

			const deal = await this.hubSpotService.getDealById(dealId, properties);
			return c.json(deal);
		} catch (err) {
			logger.error(err);
			return serveInternalServerError(c, err);
		}
	};
}
