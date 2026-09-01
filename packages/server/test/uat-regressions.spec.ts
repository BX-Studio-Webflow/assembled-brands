import { beforeEach, describe, expect, it } from 'vitest';

import type { DealApplicationRepository } from '../src/repository/deal-application.ts';
import type { HubspotContactWebhookRepository } from '../src/repository/hubspot-contact-webhook.ts';
import type { HubspotDealWebhookRepository } from '../src/repository/hubspot-deal-webhook.ts';
import type { DealApplication } from '../src/schema/schema.ts';
import { DealApplicationService } from '../src/service/deal-application.ts';
import { HubSpotService } from '../src/service/hubspot.ts';
import type { UserService } from '../src/service/user.ts';
import { isDealCredentialRecoveryEvent } from '../src/web/controller/hubspot.ts';

const application = (id: number, userId = 1): DealApplication => ({
	id,
	user_id: userId,
	hubspot_deal_object_id: 1000 + id,
	hubspot_deal_webhook_event_id: null,
	status: 'active',
	legal_name: `Application ${id}`,
	temporary_password: null,
	underwriting_email_sent_at: null,
	slack_alert_sent_at: null,
	created_at: new Date(),
	updated_at: new Date(),
});

describe('UAT regressions', () => {
	beforeEach(() => {
		process.env.SECRET_KEY = 'uat-regression-test-key';
	});

	it('creates stable but unique temporary passwords per application', async () => {
		const rows = new Map<number, DealApplication>([
			[1, application(1)],
			[2, application(2)],
		]);
		const repo = {
			findById: async (id: number) => rows.get(id),
			findByUserId: async (userId: number) => [...rows.values()].filter((row) => row.user_id === userId),
			update: async (id: number, data: Partial<DealApplication>) => {
				const current = rows.get(id);
				if (!current) return undefined;
				const updated = { ...current, ...data };
				rows.set(id, updated);
				return updated;
			},
		} as unknown as DealApplicationRepository;
		const service = new DealApplicationService(repo);

		const first = await service.getOrCreateTemporaryPassword(1);
		const firstAgain = await service.getOrCreateTemporaryPassword(1);
		const second = await service.getOrCreateTemporaryPassword(2);

		expect(firstAgain).toBe(first);
		expect(second).not.toBe(first);
		expect((await service.findByUserAndTemporaryPassword(1, first))?.id).toBe(1);
		expect((await service.findByUserAndTemporaryPassword(1, second))?.id).toBe(2);
	});

	it('recovers credentials on association and deal property-change webhooks', () => {
		expect(isDealCredentialRecoveryEvent('deal.associationChange')).toBe(true);
		expect(isDealCredentialRecoveryEvent('deal.association.created')).toBe(true);
		expect(isDealCredentialRecoveryEvent('deal.propertyChange')).toBe(true);
		expect(isDealCredentialRecoveryEvent('contact.propertyChange')).toBe(false);
	});

	it('sends the submission Slack alert once without requiring a selected team member', async () => {
		let row = application(3);
		let slackCalls = 0;
		const dealApplicationService = {
			findById: async () => row,
			markSlackAlertSent: async () => {
				row = { ...row, slack_alert_sent_at: new Date() };
				return row;
			},
		} as unknown as DealApplicationService;
		const dealRepo = {
			findProcessedByDealObjectId: async () => ({ portal_id: 2473032 }),
		} as unknown as HubspotDealWebhookRepository;
		const service = new HubSpotService({} as HubspotContactWebhookRepository, dealRepo, {} as UserService, dealApplicationService);
		Object.assign(service, {
			getDealById: async () => ({ properties: { dealname: 'UAT submission' } }),
			getDealAssociatedContactIds: async () => ['123'],
			getContactById: async () => ({
				properties: { email: 'applicant@example.com', firstname: 'Test', lastname: 'Applicant' },
			}),
			sendSlackUnderwritingAlert: async () => {
				slackCalls += 1;
				return true;
			},
		});

		expect(await service.sendSubmissionUnderwritingAlerts(3)).toEqual({ emailSent: false, slackSent: true });
		expect(await service.sendSubmissionUnderwritingAlerts(3)).toEqual({ emailSent: false, slackSent: false });
		expect(slackCalls).toBe(1);
		expect(row.slack_alert_sent_at).toBeInstanceOf(Date);
	});
});
