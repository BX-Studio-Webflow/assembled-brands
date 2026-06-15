import { env } from 'cloudflare:workers';

import { logger } from '../lib/logger.ts';
import { sendSlackMessage } from '../lib/slack.ts';

export class SlackNotifierService {
	/**
	 * Posts a warm inbound deal alert to the configured Slack channel.
	 * Non-fatal: logs and returns when Slack is unavailable or not configured.
	 */
	public async sendUnderwritingDealAlert(params: {
		dealName: string | null;
		dealObjectId: number;
		contactEmail: string;
		contactName?: string;
		ownerEmail?: string;
		portalId?: number;
		applicationLink: string;
	}): Promise<void> {
		const webhookUrl = env.SLACK_WEBHOOK_URL;
		if (!webhookUrl) {
			logger.debug('SLACK_WEBHOOK_URL not configured, skipping Slack underwriting alert');
			return;
		}

		try {
			const dealLabel = params.dealName ?? `Deal #${params.dealObjectId}`;
			const contactLabel = params.contactName ? `${params.contactName} (${params.contactEmail})` : params.contactEmail;
			const hubspotDealLink =
				params.portalId != null ? `https://app.hubspot.com/contacts/${params.portalId}/deal/${params.dealObjectId}` : undefined;

			const lines = [`🔔 New warm inbound deal: *${dealLabel}*`, `Contact: ${contactLabel}`];
			if (params.ownerEmail) {
				lines.push(`Owner: ${params.ownerEmail}`);
			}
			lines.push(`Application link: ${params.applicationLink}`);
			if (hubspotDealLink) {
				lines.push(`HubSpot: ${hubspotDealLink}`);
			}

			await sendSlackMessage(webhookUrl, lines.join('\n'));
			logger.info({ dealObjectId: params.dealObjectId }, 'Underwriting alert sent to Slack');
		} catch (err) {
			logger.error({ err, dealObjectId: params.dealObjectId }, 'Failed to send underwriting alert to Slack (non-fatal)');
		}
	}
}
