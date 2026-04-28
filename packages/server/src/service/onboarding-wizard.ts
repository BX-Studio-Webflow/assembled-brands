import { logger } from '../lib/logger.ts';
import type { OnboardingWizardRepository } from '../repository/onboarding-wizard.ts';
import type { NewOnboardingApplication, OnboardingApplication, User } from '../schema/schema.ts';
import type { OnboardingStep1Body, OnboardingStep2Body, OnboardingStep3Body, WarmLeadDetailsBody } from '../web/validator/onboarding.js';
import type { BusinessService } from './business.ts';
import type { HubSpotService } from './hubspot.ts';
import type { UserService } from './user.ts';

/**
 * Service class for managing onboarding wizard applications
 */
export class OnboardingWizardService {
	private repo: OnboardingWizardRepository;
	private hubSpotService: HubSpotService;
	private userService: UserService;
	private businessService: BusinessService;

	constructor(
		onboardingWizardRepo: OnboardingWizardRepository,
		hubSpotService: HubSpotService,
		userService: UserService,
		businessService: BusinessService,
	) {
		this.repo = onboardingWizardRepo;
		this.hubSpotService = hubSpotService;
		this.userService = userService;
		this.businessService = businessService;
	}

	/**
	 * Creates a new onboarding application
	 * @param {number} userId - ID of the user
	 * @returns {Promise<OnboardingApplication>} Created application
	 * @throws {Error} When application creation fails
	 */
	public async create(userId: number): Promise<OnboardingApplication> {
		try {
			const record = await this.repo.create({
				user_id: userId,
				current_step: 1,
				is_qualified: false,
				is_complete: false,
				is_rejected: false,
			});
			return record[0];
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Finds application by user ID
	 * @param {number} userId - ID of the user
	 * @returns {Promise<OnboardingApplication|undefined>} The application if found
	 * @throws {Error} When application retrieval fails
	 */
	public async findByUserId(userId: number) {
		try {
			return await this.repo.findByUserId(userId);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Finds application by ID
	 * @param {number} id - ID of the application
	 * @returns {Promise<OnboardingApplication|undefined>} The application if found
	 * @throws {Error} When application retrieval fails
	 */
	public async findById(id: number) {
		try {
			return await this.repo.findById(id);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Gets or creates an application for a user
	 * @param {number} userId - ID of the user
	 * @returns {Promise<OnboardingApplication>} The application
	 * @throws {Error} When application retrieval/creation fails
	 */
	public async getOrCreate(userId: number): Promise<OnboardingApplication> {
		try {
			let application = await this.repo.findByUserId(userId);
			if (!application) {
				application = await this.create(userId);
			}
			return application;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Saves Step 1 data (Company Info)
	 * @param {number} userId - ID of the user
	 * @param {OnboardingStep1Body} data - Step 1 data
	 * @returns {Promise<OnboardingApplication>} Updated application
	 * @throws {Error} When saving step 1 fails
	 */
	public async saveStep1(userId: number, data: OnboardingStep1Body): Promise<OnboardingApplication> {
		try {
			const application = await this.getOrCreate(userId);
			await this.repo.update(application.id, {
				legal_name: data.legal_name,
				employee_count: data.employee_count,
				website: data.website || null,
				current_step: 2,
				updated_at: new Date(),
			});
			const result = await this.repo.findById(application.id);
			if (!result) {
				throw new Error('Failed to retrieve updated application');
			}
			return result;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Saves Step 2 data (Business Details)
	 * @param {number} userId - ID of the user
	 * @param {OnboardingStep2Body} data - Step 2 data
	 * @returns {Promise<OnboardingApplication>} Updated application
	 * @throws {Error} When saving step 2 fails
	 */
	public async saveStep2(userId: number, data: OnboardingStep2Body): Promise<OnboardingApplication> {
		try {
			const application = await this.findByUserId(userId);
			if (!application) {
				throw new Error('Application not found');
			}
			await this.repo.update(application.id, {
				years_in_business: data.years_in_business,
				asset_type: data.asset_type,
				desired_loan_amount: data.desired_loan_amount,
				current_step: 3,
				updated_at: new Date(),
			});
			const result = await this.repo.findById(application.id);
			if (!result) {
				throw new Error('Failed to retrieve updated application');
			}
			return result;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Saves Step 3 data (Qualification)
	 * @param {number} userId - ID of the user
	 * @param {OnboardingStep3Body} data - Step 3 data
	 * @returns {Promise<OnboardingApplication>} Updated application
	 * @throws {Error} When saving step 3 fails
	 */
	public async saveStep3(userId: number, data: OnboardingStep3Body): Promise<OnboardingApplication> {
		try {
			const application = await this.findByUserId(userId);
			if (!application) {
				throw new Error('Application not found');
			}

			// Determine qualification based on revenue qualification
			const isQualified = data.revenue_qualification === 'yes';

			await this.repo.update(application.id, {
				company_type: data.company_type,
				company_type_other: data.company_type_other || null,
				revenue_qualification: data.revenue_qualification,
				is_qualified: isQualified,
				is_rejected: !isQualified,
				is_complete: isQualified && application.current_step === 3,
				rejection_reason: !isQualified ? 'Revenue qualification not met' : null,
				current_step: 3,
				updated_at: new Date(),
			});
			const result = await this.repo.findById(application.id);
			if (!result) {
				throw new Error('Failed to retrieve updated application');
			}

			// If disqualified, send to HubSpot and delete user account
			if (!isQualified) {
				const user = await this.userService.find(userId);
				if (user) {
					try {
						const [hubspotResult] = await Promise.allSettled([
							this.hubSpotService.sendDisqualifiedLead(user, result),
							this.userService.delete(userId),
						]);

						if (hubspotResult.status === 'fulfilled') {
							logger.info(`Disqualified lead ${userId} sent to HubSpot. HubSpot ID: ${hubspotResult.value.id}`);
						} else {
							logger.error({ error: hubspotResult.reason }, `Failed to send disqualified lead ${userId} to HubSpot`);
						}

						logger.info(`User account ${userId} deletion attempted for disqualified lead`);
					} catch (error) {
						logger.error(error);
					}
				}
			}

			return result;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Updates the current step
	 * @param {number} userId - ID of the user
	 * @param {number} step - Step number (1, 2, or 3)
	 * @returns {Promise<OnboardingApplication>} Updated application
	 * @throws {Error} When step update fails
	 */
	public async updateStep(userId: number, step: number): Promise<OnboardingApplication> {
		try {
			const application = await this.findByUserId(userId);
			if (!application) {
				throw new Error('Application not found');
			}
			await this.repo.update(application.id, {
				current_step: step,
				updated_at: new Date(),
			});
			const result = await this.repo.findById(application.id);
			if (!result) {
				throw new Error('Failed to retrieve updated application');
			}
			return result;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Marks application as complete
	 * @param {number} userId - ID of the user
	 * @returns {Promise<OnboardingApplication>} Completed application
	 * @throws {Error} When completion fails
	 */
	public async completeApplication(userId: number): Promise<OnboardingApplication> {
		try {
			const application = await this.findByUserId(userId);
			if (!application) {
				throw new Error('Application not found');
			}
			await this.repo.update(application.id, {
				is_complete: true,
				updated_at: new Date(),
			});
			const result = await this.repo.findById(application.id);
			if (!result) {
				throw new Error('Failed to retrieve completed application');
			}
			return result;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Gets progress for a user
	 * @param {number} userId - ID of the user
	 * @returns {Promise<OnboardingApplication|undefined>} The application progress
	 * @throws {Error} When progress retrieval fails
	 */
	public async getProgress(userId: number) {
		try {
			return await this.repo.findByUserId(userId);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Updates an existing application
	 * @param {number} id - ID of the application to update
	 * @param {Partial<NewOnboardingApplication>} data - Updated application data
	 * @returns {Promise<void>}
	 * @throws {Error} When application update fails
	 */
	public async update(id: number, data: Partial<NewOnboardingApplication>): Promise<void> {
		try {
			await this.repo.update(id, data);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Unauthenticated warm-lead submission.
	 * Resolves the platform user from the HubSpot deal ID, then upserts their
	 * onboarding application with the submitted company details.
	 *
	 * @param body - Validated warm-lead form body (includes deal_id)
	 * @returns The upserted onboarding application
	 * @throws {Error} When deal not found, user not linked, or DB write fails
	 */
	public async saveWarmLeadDetails(body: WarmLeadDetailsBody): Promise<{ application: OnboardingApplication; user: User }> {
		try {
			const dealRow = await this.hubSpotService.findProcessedDealByObjectId(body.deal_id);
			if (!dealRow) {
				throw new Error(`No processed deal found for deal_id ${body.deal_id}`);
			}
			if (!dealRow.user_id) {
				throw new Error(`Deal ${body.deal_id} has no associated user yet`);
			}
			const userId = dealRow.user_id;

			const user = await this.userService.find(userId);
			if (!user) {
				throw new Error(`No user found for deal ${body.deal_id}`);
			}

			const update: Partial<NewOnboardingApplication> = {
				legal_name: body.legal_name,
				incorporation_state: body.incorporation_state,
				net_revenue_last_12_months: body.net_revenue_last_12_months,
				working_with_team_member: body.working_with_team_member,
				team_member_email: body.working_with_team_member ? (body.team_member_email ?? null) : null,
				updated_at: new Date(),
			};

			let savedApplication: OnboardingApplication;
			const existing = await this.repo.findByUserId(userId);
			if (existing) {
				await this.repo.update(existing.id, update);
				const refreshed = await this.repo.findById(existing.id);
				if (!refreshed) throw new Error('Failed to retrieve updated application');
				savedApplication = refreshed;
			} else {
				const [created] = await this.repo.create({ user_id: userId, ...update });
				if (!created) throw new Error('Failed to create warm-lead application');
				savedApplication = created;
			}

			// Provision Google Drive folder structure + business record (non-fatal).
			// Uses legal_name as the company name and incorporation_state as headquarters.
			// accounting_software defaults to 'other' since warm leads haven't specified it yet.
			try {
				await this.businessService.upsertBusiness(userId, {
					legal_name: body.legal_name,
					headquarters: body.incorporation_state,
					accounting_software: 'other',
				});
				logger.info({ userId }, 'Business and Google Drive folders provisioned for warm lead');
			} catch (bizErr) {
				logger.error({ bizErr, userId }, 'Failed to provision business/Drive folders for warm lead (non-fatal)');
			}

			// Push fields back to HubSpot. Non-fatal: a failure here does not roll back
			// the DB write — the team can reconcile manually if needed.
			try {
				await this.hubSpotService.updateDeal(body.deal_id, {
					dealname: body.legal_name,
					hq_state: body.incorporation_state,
					annual_revenue: body.net_revenue_last_12_months,
					ownerEmail: body.working_with_team_member ? body.team_member_email : undefined,
				});
			} catch (hsErr) {
				logger.error({ hsErr, deal_id: body.deal_id }, 'Failed to sync warm-lead fields to HubSpot (non-fatal)');
			}

			return { application: savedApplication, user };
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	public async saveWarmLeadDetailsForUser(
		userId: number,
		body: Omit<WarmLeadDetailsBody, 'deal_id'>,
	): Promise<{ application: OnboardingApplication; user: User }> {
		const dealRow = await this.hubSpotService.findProcessedDealByUserId(userId);
		if (!dealRow) {
			throw new Error(`No processed deal found for user ${userId}`);
		}
		return this.saveWarmLeadDetails({
			deal_id: dealRow.object_id,
			...body,
		});
	}

	/**
	 * Deletes an application
	 * @param {number} id - ID of the application to delete
	 * @returns {Promise<void>}
	 * @throws {Error} When application deletion fails
	 */
	public async delete(id: number): Promise<void> {
		try {
			await this.repo.delete(id);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}
}
