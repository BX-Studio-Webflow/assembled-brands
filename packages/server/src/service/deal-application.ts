import { decrypt, encrypt, verify } from '../lib/encryption.ts';
import { logger } from '../lib/logger.ts';
import type { DealApplicationRepository } from '../repository/deal-application.ts';
import type { DealApplication } from '../schema/schema.ts';
import { generateSecurePassword } from '../util/string.ts';

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

	public async getOrCreateTemporaryPassword(id: number): Promise<string> {
		const application = await this.repo.findById(id);
		if (!application) {
			throw new Error(`Deal application ${id} not found`);
		}
		if (application.temporary_password) {
			return decrypt(application.temporary_password);
		}
		const password = generateSecurePassword(10);
		await this.repo.update(id, { temporary_password: encrypt(password), updated_at: new Date() });
		return password;
	}

	public verifyTemporaryPassword(application: DealApplication, password: string): boolean {
		if (!application.temporary_password) return false;
		try {
			return verify(password, application.temporary_password);
		} catch {
			return false;
		}
	}

	public async findByUserAndTemporaryPassword(userId: number, password: string): Promise<DealApplication | null> {
		const applications = await this.repo.findByUserId(userId);
		return applications.find((application) => this.verifyTemporaryPassword(application, password)) ?? null;
	}

	public async markUnderwritingEmailSent(id: number) {
		return this.repo.update(id, { underwriting_email_sent_at: new Date(), updated_at: new Date() });
	}

	public async markSlackAlertSent(id: number) {
		return this.repo.update(id, { slack_alert_sent_at: new Date(), updated_at: new Date() });
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
			const existing = await this.repo.findByHubspotDealObjectId(params.hubspotDealObjectId);
			if (existing) {
				return existing;
			}

			await this.repo.supersedeActiveForUser(params.userId);

			const created = await this.repo.create({
				user_id: params.userId,
				hubspot_deal_object_id: params.hubspotDealObjectId,
				hubspot_deal_webhook_event_id: params.hubspotDealWebhookEventId,
				legal_name: params.legalName ?? undefined,
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
