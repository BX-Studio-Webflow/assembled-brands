import type { Context } from 'hono';

import { logger } from '../../lib/logger.js';
import type { User } from '../../schema/schema.js';
import type { OnboardingWizardService } from '../../service/onboarding-wizard.js';
import type { UserService } from '../../service/user.js';
import type { UpdateStepBody } from '../validator/financial-wizard.js';
import type { OnboardingStep1Body, OnboardingStep2Body, OnboardingStep3Body } from '../validator/onboarding.ts';
import { ERRORS, serveBadRequest, serveInternalServerError } from './resp/error.js';
import { serveData } from './resp/resp.js';

export class OnboardingWizardController {
	private service: OnboardingWizardService;
	private userService: UserService;

	constructor(service: OnboardingWizardService, userService: UserService) {
		this.service = service;
		this.userService = userService;
	}

	/**
	 * Retrieves user information from JWT payload
	 * @param {Context} c - The Hono context
	 * @returns {Promise<User | undefined>} The user if found
	 * @private
	 */
	private async getUser(c: Context) {
		const { email } = c.get('jwtPayload');
		const user = await this.userService.findByEmail(email);
		return user;
	}

	/**
	 * Gets the effective user ID for the request (hostId if team access, otherwise user.id)
	 * @param {Context} c - The Hono context
	 * @param {User} user - The authenticated user
	 * @returns {number} The effective user ID to use for service calls
	 * @private
	 */
	private getEffectiveUserId(c: Context, user: User): number {
		const hostId = c.get('hostId');
		return hostId || user.id;
	}

	/**
	 * Saves Step 1: Company Info
	 * @param {Context} c - The Hono context containing step 1 data
	 * @returns {Promise<Response>} Response containing saved application data
	 * @throws {Error} When saving step 1 fails
	 */
	public saveStep1 = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const body: OnboardingStep1Body = await c.req.json();
			const effectiveUserId = this.getEffectiveUserId(c, user);
			const application = await this.service.saveStep1(effectiveUserId, body);

			return serveData(c, {
				message: 'Step 1 saved successfully',
				application,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Saves Step 2: Business Details
	 * @param {Context} c - The Hono context containing step 2 data
	 * @returns {Promise<Response>} Response containing saved application data
	 * @throws {Error} When saving step 2 fails
	 */
	public saveStep2 = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const effectiveUserId = this.getEffectiveUserId(c, user);
			const application = await this.service.findByUserId(effectiveUserId);
			if (!application) {
				return serveBadRequest(c, "Ops, we can't find your application. Have you started it yet?");
			}

			const body: OnboardingStep2Body = await c.req.json();
			const updatedApplication = await this.service.saveStep2(effectiveUserId, body);

			return serveData(c, {
				message: 'Step 2 saved successfully',
				application: updatedApplication,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Saves Step 3: Qualification
	 * @param {Context} c - The Hono context containing step 3 data
	 * @returns {Promise<Response>} Response containing saved application data
	 * @throws {Error} When saving step 3 fails
	 */
	public saveStep3 = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const effectiveUserId = this.getEffectiveUserId(c, user);
			const application = await this.service.findByUserId(effectiveUserId);
			if (!application) {
				return serveBadRequest(c, "Ops, we can't find your application. Have you started it yet?");
			}

			const body: OnboardingStep3Body = await c.req.json();
			const updatedApplication = await this.service.saveStep3(effectiveUserId, body);

			return serveData(c, {
				message: 'Step 3 saved successfully',
				application: updatedApplication,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Gets current progress
	 * @param {Context} c - The Hono context
	 * @returns {Promise<Response>} Response containing progress data
	 * @throws {Error} When progress retrieval fails
	 */
	public getProgress = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const effectiveUserId = this.getEffectiveUserId(c, user);
			const application = await this.service.getProgress(effectiveUserId);
			if (!application) {
				return serveBadRequest(c, "Ops, we can't find your application. Have you started it yet?");
			}

			// Calculate percentage (3 steps total)
			const currentStep = application.current_step || 1;
			const totalSteps = 3;
			const percentage = application.is_complete ? 100 : Math.round((currentStep / totalSteps) * 100);

			const progress = {
				current_step: currentStep,
				is_complete: application.is_complete || false,
				is_qualified: application.is_qualified || false,
				is_rejected: application.is_rejected || false,
				rejection_reason: application.rejection_reason || null,
				percentage,
				step1: {
					legal_name: application.legal_name || null,
					employee_count: application.employee_count || null,
					website: application.website || null,
				},
				step2: {
					years_in_business: application.years_in_business || null,
					asset_type: application.asset_type || null,
					desired_loan_amount: application.desired_loan_amount || null,
				},
				step3: {
					company_type: application.company_type || null,
					company_type_other: application.company_type_other || null,
					revenue_qualification: application.revenue_qualification || null,
				},
			};

			return serveData(c, {
				progress,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Updates the current step
	 * @param {Context} c - The Hono context containing step update data
	 * @returns {Promise<Response>} Response containing updated application data
	 * @throws {Error} When step update fails
	 */
	public updateStep = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const effectiveUserId = this.getEffectiveUserId(c, user);
			const application = await this.service.findByUserId(effectiveUserId);
			if (!application) {
				return serveBadRequest(c, "Ops, we can't find your application. Have you started it yet?");
			}

			const body: UpdateStepBody = await c.req.json();
			const updatedApplication = await this.service.updateStep(effectiveUserId, body.step);

			return serveData(c, {
				message: 'Step updated successfully',
				application: updatedApplication,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Marks application as complete
	 * @param {Context} c - The Hono context
	 * @returns {Promise<Response>} Response containing completed application data
	 * @throws {Error} When completion fails
	 */
	public completeApplication = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const effectiveUserId = this.getEffectiveUserId(c, user);
			const application = await this.service.findByUserId(effectiveUserId);
			if (!application) {
				return serveBadRequest(c, "Ops, we can't find your application. Have you started it yet?");
			}

			const completedApplication = await this.service.completeApplication(effectiveUserId);

			return serveData(c, {
				message: 'Onboarding completed successfully',
				application: completedApplication,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};
}
