import { logger } from '../lib/logger.ts';
import type { DealApplicationRepository } from '../repository/deal-application.ts';
import type { DealApplication } from '../schema/schema.ts';
import { buildWarmLeadApplicationLink } from '../util/frontend-urls.ts';

export class DealApplicationService {
	private repo: DealApplicationRepository;

	constructor(repo: DealApplicationRepository) {
		this.repo = repo;
	}

	public async findById(id: number) {
		return this.repo.findById(id);
	}

	public async findByHubspotDealObjectId(hubspotDealObjectId: number) {
		return this.repo.findByHubspotDealObjectId(hubspotDealObjectId);
	}

	public async findActiveByUserId(userId: number) {
		return this.repo.findActiveByUserId(userId);
	}

	public async listForUser(userId: number) {
		return this.repo.findByUserId(userId);
	}

	public async updateLegalName(id: number, legalName: string) {
		return this.repo.update(id, { legal_name: legalName, updated_at: new Date() });
	}

	/**
	 * Creates a new deal-scoped application when HubSpot fires deal.creation.
	 * Idempotent per HubSpot deal object ID; supersedes prior active applications for the same user.
	 */
	public async createForNewDeal(params: {
		userId: number;
		hubspotDealObjectId: number;
		hubspotDealWebhookEventId?: number;
		legalName?: string | null;
	}): Promise<DealApplication> {
		try {
			const applicationLink = buildWarmLeadApplicationLink(params.hubspotDealObjectId);
			const existing = await this.repo.findByHubspotDealObjectId(params.hubspotDealObjectId);
			if (existing) {
				if (!existing.application_link) {
					const updated = await this.repo.update(existing.id, {
						application_link: applicationLink,
						updated_at: new Date(),
					});
					if (updated) {
						return updated;
					}
				}
				return existing;
			}

			await this.repo.supersedeActiveForUser(params.userId);

			const created = await this.repo.create({
				user_id: params.userId,
				hubspot_deal_object_id: params.hubspotDealObjectId,
				hubspot_deal_webhook_event_id: params.hubspotDealWebhookEventId,
				legal_name: params.legalName ?? undefined,
				application_link: applicationLink,
				status: 'active',
			});

			if (!created) {
				throw new Error('Failed to create deal application');
			}

			return created;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}
}
