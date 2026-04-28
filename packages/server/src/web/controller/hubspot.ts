import { env } from 'cloudflare:workers';
import type { Context } from 'hono';

import { sendTemplateEmail } from '../../lib/email-processor.ts';
import { logger } from '../../lib/logger.js';
import type { NewUser } from '../../schema/schema.ts';
import type { HubSpotService } from '../../service/hubspot.js';
import type { UserService } from '../../service/user.js';
import { generateSecurePassword } from '../../util/string.ts';
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
					return this.handleContactCreation(c, first);
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
				return c.json({ message: 'User already exists' });
			}

			const password = generateSecurePassword(8);
			const newUser: NewUser = {
				email,
				password,
				role: 'user',
				dial_code: '+1',
				phone: phone || '',
				first_name: firstname,
				last_name: lastname,
			};
			const [createdUser] = await this.userService.create(newUser);
			if (!createdUser) {
				await this.hubSpotService.markContactWebhookFailed(webhookRowId, 'Failed to create user');
				return c.json({ message: 'Failed to create user', code: 'FAILED_TO_CREATE_USER' }, 400);
			}

			const devPrefix = env.NODE_ENV === 'development' ? '/dev' : '';
			await sendTemplateEmail(email, firstname || 'Dear User', env.TRANSACTIONAL_EMAIL_TEMPLATE_ID, {
				subject: 'Welcome to Assembled Brands',
				title: 'Welcome to Assembled Brands',
				subtitle: 'Welcome to Assembled Brands',
				name: firstname || 'Dear User',
				body: `Welcome to Assembled Brands. We are glad to have you on board. Your credentials — Email: ${email}, Password: ${password}. Click below to complete onboarding: ${env.FRONTEND_URL}${devPrefix}/account-setup-finish-verification?email=${email}&id=${createdUser.id}`,
				buttonText: 'Complete onboarding',
				buttonLink: `${env.FRONTEND_URL}${devPrefix}/login?email=${email}&id=${createdUser.id}`,
			});

			await this.hubSpotService.markContactWebhookProcessedForNewUser(webhookRowId, createdUser.id);
			return c.json({ message: 'User created successfully, please check your email for your verification code' });
		} catch (err) {
			await this.hubSpotService.markContactWebhookError(webhookRowId, err);
			return serveInternalServerError(c, err);
		}
	};

	private handleDealCreation = async (c: Context, event: Parameters<HubSpotService['processNewDealWebhook']>[0]) => {
		await this.hubSpotService.processNewDealWebhook(event);
		return c.json({ message: 'Deal webhook processed' });
	};
}
