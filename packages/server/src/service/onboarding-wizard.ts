import { logger } from '../lib/logger.ts';
import type { OnboardingWizardRepository } from '../repository/onboarding-wizard.ts';
import type { NewOnboardingApplication, OnboardingApplication } from '../schema/schema.ts';
import type { OnboardingStep1Body, OnboardingStep2Body, OnboardingStep3Body } from '../web/validator/onboarding.js';

/**
 * Service class for managing onboarding wizard applications
 */
export class OnboardingWizardService {
	private repo: OnboardingWizardRepository;

	constructor(onboardingWizardRepo: OnboardingWizardRepository) {
		this.repo = onboardingWizardRepo;
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
			const updated = await this.repo.update(application.id, {
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
			const application = await this.getOrCreate(userId);
			const updated = await this.repo.update(application.id, {
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
			const application = await this.getOrCreate(userId);

			// Determine qualification based on revenue qualification
			const isQualified = data.revenue_qualification === 'yes';

			const updated = await this.repo.update(application.id, {
				company_type: data.company_type,
				company_type_other: data.company_type_other || null,
				revenue_qualification: data.revenue_qualification,
				is_qualified: isQualified,
				is_rejected: !isQualified,
				rejection_reason: !isQualified ? 'Revenue qualification not met' : null,
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
	 * Updates the current step
	 * @param {number} userId - ID of the user
	 * @param {number} step - Step number (1, 2, or 3)
	 * @returns {Promise<OnboardingApplication>} Updated application
	 * @throws {Error} When step update fails
	 */
	public async updateStep(userId: number, step: number): Promise<OnboardingApplication> {
		try {
			const application = await this.getOrCreate(userId);
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
			const application = await this.getOrCreate(userId);
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
