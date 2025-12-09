import type { Context } from 'hono';

import { logger } from '../../lib/logger.js';
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
			const application = await this.service.saveStep1(user.id, body);

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

			const body: OnboardingStep2Body = await c.req.json();
			const application = await this.service.saveStep2(user.id, body);

			return serveData(c, {
				message: 'Step 2 saved successfully',
				application,
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

			const body: OnboardingStep3Body = await c.req.json();
			const application = await this.service.saveStep3(user.id, body);

			return serveData(c, {
				message: 'Step 3 saved successfully',
				application,
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

			const progress = await this.service.getProgress(user.id);
			if (!progress) {
				return serveData(c, {
					message: 'No onboarding progress found',
					progress: null,
				});
			}

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

			const body: UpdateStepBody = await c.req.json();
			const application = await this.service.updateStep(user.id, body.step);

			return serveData(c, {
				message: 'Step updated successfully',
				application,
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

			const application = await this.service.completeApplication(user.id);

			return serveData(c, {
				message: 'Onboarding completed successfully',
				application,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};
}
