import { env } from 'cloudflare:workers';

import { logger } from '../lib/logger.ts';
import { postSlackMessage, type SlackPostMessageResult } from '../lib/slack.ts';
import { buildGoogleDriveFolderUrl } from '../util/drive-naming.ts';
import { buildWarmLeadApplicationLink } from '../util/frontend-urls.ts';
import type { DealApplicationService } from './deal-application.ts';

export class SlackNotifierService {
	private dealApplicationService?: DealApplicationService;

	constructor(dealApplicationService?: DealApplicationService) {
		this.dealApplicationService = dealApplicationService;
	}

	private getSlackConfig(): { botToken: string; channelId: string } {
		const botToken = env.SLACK_BOT_TOKEN;
		const channelId = env.SLACK_CHANNEL_ID;
		if (!botToken || !channelId) {
			throw new Error('SLACK_BOT_TOKEN or SLACK_CHANNEL_ID not configured');
		}
		return { botToken, channelId };
	}

	/** Sends a plain test message to Slack. Throws when Slack is misconfigured or the API fails. */
	public async sendTestNotification(text?: string): Promise<SlackPostMessageResult> {
		const { botToken, channelId } = this.getSlackConfig();
		return postSlackMessage({
			botToken,
			channelId,
			text: text ?? '🧪 Test notification from Assembled Brands API',
		});
	}

	/** Sends a sample underwriting alert to Slack. Throws when Slack is misconfigured or the API fails. */
	public async sendTestUnderwritingAlert(overrides?: {
		dealObjectId?: number;
		dealName?: string | null;
		contactEmail?: string;
		contactName?: string;
		ownerEmail?: string;
		portalId?: number;
		applicationLink?: string;
	}): Promise<SlackPostMessageResult> {
		const dealObjectId = overrides?.dealObjectId ?? 999999999;
		const { botToken, channelId } = this.getSlackConfig();

		const dealApplication = await this.dealApplicationService?.findByHubspotDealObjectId(dealObjectId);
		const threadTs = dealApplication?.slack_thread_ts ?? undefined;
		const dealLabel = overrides?.dealName ?? 'Test Deal (API)';
		const contactEmail = overrides?.contactEmail ?? 'test@example.com';
		const contactName = overrides?.contactName ?? 'Test Contact';
		const contactLabel = `${contactName} (${contactEmail})`;
		const applicationLink = overrides?.applicationLink ?? buildWarmLeadApplicationLink(dealObjectId);
		const hubspotDealLink =
			overrides?.portalId != null ? `https://app.hubspot.com/contacts/${overrides.portalId}/deal/${dealObjectId}` : undefined;

		const lines = threadTs
			? [`↪️ Update on *${dealLabel}*`, `Contact: ${contactLabel}`]
			: [`🔔 New warm inbound deal: *${dealLabel}*`, `Contact: ${contactLabel}`];

		if (overrides?.ownerEmail) {
			lines.push(`Owner: ${overrides.ownerEmail}`);
		} else {
			lines.push('Owner: owner@assembledbrands.com');
		}
		lines.push(`Application link: ${applicationLink}`);
		if (hubspotDealLink) {
			lines.push(`HubSpot: ${hubspotDealLink}`);
		}

		const result = await postSlackMessage({
			botToken,
			channelId,
			text: lines.join('\n'),
			threadTs,
		});

		if (!threadTs && dealApplication) {
			await this.dealApplicationService?.updateSlackThreadTs(dealApplication.id, result.ts);
		}

		return result;
	}
	/**
	 * Posts a warm inbound deal alert to Slack.
	 * Creates a new channel thread on first alert; subsequent alerts for the same deal reply in-thread.
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
		const botToken = env.SLACK_BOT_TOKEN;
		const channelId = env.SLACK_CHANNEL_ID;
		if (!botToken || !channelId) {
			logger.debug('SLACK_BOT_TOKEN or SLACK_CHANNEL_ID not configured, skipping Slack underwriting alert');
			return;
		}

		try {
			const dealApplication = await this.dealApplicationService?.findByHubspotDealObjectId(params.dealObjectId);
			const threadTs = dealApplication?.slack_thread_ts ?? undefined;

			const dealLabel = params.dealName ?? `Deal #${params.dealObjectId}`;
			const contactLabel = params.contactName ? `${params.contactName} (${params.contactEmail})` : params.contactEmail;
			const hubspotDealLink =
				params.portalId != null ? `https://app.hubspot.com/contacts/${params.portalId}/deal/${params.dealObjectId}` : undefined;

			const lines = threadTs
				? [`↪️ Update on *${dealLabel}*`, `Contact: ${contactLabel}`]
				: [`🔔 New warm inbound deal: *${dealLabel}*`, `Contact: ${contactLabel}`];

			if (params.ownerEmail) {
				lines.push(`Owner: ${params.ownerEmail}`);
			}
			lines.push(`Application link: ${params.applicationLink}`);
			if (hubspotDealLink) {
				lines.push(`HubSpot: ${hubspotDealLink}`);
			}

			const result = await postSlackMessage({
				botToken,
				channelId,
				text: lines.join('\n'),
				threadTs,
			});

			if (!threadTs && dealApplication) {
				await this.dealApplicationService?.updateSlackThreadTs(dealApplication.id, result.ts);
			}

			logger.info(
				{ dealObjectId: params.dealObjectId, threadTs: threadTs ?? result.ts, isThreadReply: Boolean(threadTs) },
				'Underwriting alert sent to Slack',
			);
		} catch (err) {
			logger.error({ err, dealObjectId: params.dealObjectId }, 'Failed to send underwriting alert to Slack (non-fatal)');
		}
	}

	/**
	 * Notifies Slack when a Google Drive company folder is created.
	 * Replies in the deal thread when slack_thread_ts is stored on the deal application.
	 */
	public async sendGoogleDriveFolderCreated(params: {
		legalName: string;
		folderId: string;
		folderName?: string;
		dealApplicationId?: number;
	}): Promise<void> {
		const botToken = env.SLACK_BOT_TOKEN;
		const channelId = env.SLACK_CHANNEL_ID;
		if (!botToken || !channelId) {
			logger.debug('SLACK_BOT_TOKEN or SLACK_CHANNEL_ID not configured, skipping Google Drive Slack notification');
			return;
		}

		try {
			let threadTs: string | undefined;
			if (params.dealApplicationId && this.dealApplicationService) {
				const dealApplication = await this.dealApplicationService.findById(params.dealApplicationId);
				threadTs = dealApplication?.slack_thread_ts ?? undefined;
			}

			const driveFolderUrl = buildGoogleDriveFolderUrl(params.folderId);
			const folderLabel = params.folderName ?? params.legalName;
			const lines = [`📁 Google Drive folder created for *${folderLabel}*`, `Drive folder: ${driveFolderUrl}`];

			await postSlackMessage({
				botToken,
				channelId,
				text: lines.join('\n'),
				threadTs,
			});

			logger.info(
				{ dealApplicationId: params.dealApplicationId, folderId: params.folderId, isThreadReply: Boolean(threadTs) },
				'Google Drive folder notification sent to Slack',
			);
		} catch (err) {
			logger.error(
				{ err, dealApplicationId: params.dealApplicationId, folderId: params.folderId },
				'Failed to send Google Drive folder notification to Slack (non-fatal)',
			);
		}
	}
}
