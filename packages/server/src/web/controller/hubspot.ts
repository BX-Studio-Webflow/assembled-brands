import type { Context } from 'hono';

import { logger } from '../../lib/logger.js';
import type { HubSpotService } from '../../service/hubspot.js';
import type { UserService } from '../../service/user.js';
import { hubspotCrmWebhookEventSchema } from '../validator/user.js';
import { getErrorPhrase } from '../validator/validator.js';
import { serveBadRequest, serveInternalServerError, serveUnprocessableEntity } from './resp/error.js';

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
					return;
				case 'deal.creation':
					return this.handleDealCreation(c, first);
				default:
					logger.warn({ subscriptionType: first.subscriptionType }, 'Unhandled HubSpot subscription type');
					return c.json({ message: `Unhandled subscription type: ${first.subscriptionType}` });
			}
		} catch (err) {
			logger.error(err);
			return serveInternalServerError(c, err);
		}
	};

	private handleDealCreation = async (c: Context, event: Parameters<HubSpotService['processNewDealWebhook']>[0]) => {
		await this.hubSpotService.processNewDealWebhook(event);
		return c.json({ message: 'Deal webhook processed' });
	};

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
