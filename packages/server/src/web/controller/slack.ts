import { env } from 'cloudflare:workers';
import type { Context } from 'hono';
import { z } from 'zod';

import { logger } from '../../lib/logger.ts';
import type { SlackNotifierService } from '../../service/slack-notifier.ts';
import type { UserService } from '../../service/user.ts';
import { serveBadRequest, serveInternalServerError } from './resp/error.js';
import { serveData } from './resp/resp.js';

const slackTestBodySchema = z.object({
	type: z.enum(['simple', 'underwriting']).default('simple'),
	text: z.string().optional(),
	deal_object_id: z.number().int().positive().optional(),
	deal_name: z.string().nullable().optional(),
	contact_email: z.string().email().optional(),
	contact_name: z.string().optional(),
	owner_email: z.string().email().optional(),
	portal_id: z.number().int().positive().optional(),
	application_link: z.string().url().optional(),
});

export class SlackController {
	private slackNotifierService: SlackNotifierService;
	private userService: UserService;

	constructor(slackNotifierService: SlackNotifierService, userService: UserService) {
		this.slackNotifierService = slackNotifierService;
		this.userService = userService;
	}

	/**
	 * POST /api/v1/slack/test
	 * Sends a test message through the Slack bot integration.
	 * Requires admin auth in production; open in development for easier local testing.
	 */
	public sendTestNotification = async (c: Context) => {
		try {
			if (env.NODE_ENV === 'production') {
				const user = await this.getUser(c);
				if (!user || user.role !== 'admin') {
					return serveBadRequest(c, 'Only admins can send Slack test notifications in production');
				}
			}

			const rawBody = await c.req.json().catch(() => ({}));
			const parsed = slackTestBodySchema.safeParse(rawBody);
			if (!parsed.success) {
				return serveBadRequest(c, parsed.error.issues.map((issue) => issue.message).join(', '));
			}

			const body = parsed.data;
			const result =
				body.type === 'underwriting'
					? await this.slackNotifierService.sendTestUnderwritingAlert({
							dealObjectId: body.deal_object_id,
							dealName: body.deal_name,
							contactEmail: body.contact_email,
							contactName: body.contact_name,
							ownerEmail: body.owner_email,
							portalId: body.portal_id,
							applicationLink: body.application_link,
						})
					: await this.slackNotifierService.sendTestNotification(body.text);

			return serveData(c, {
				ok: true,
				type: body.type,
				channel: result.channel,
				ts: result.ts,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	private async getUser(c: Context) {
		const jwtPayload = c.get('jwtPayload') as { email?: string } | undefined;
		if (!jwtPayload?.email) {
			return null;
		}
		return this.userService.findByEmail(jwtPayload.email);
	}
}
