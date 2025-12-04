import type { Context } from 'hono';

import { logger } from '../../lib/logger.js';
import { FinancialWizardService } from '../../service/financial-wizard.js';
import type { UserService } from '../../service/user.js';
import type {
	FinancialDocumentBody,
	FinancialOverviewBody,
	UpdateStepBody,
} from '../validator/financial-wizard.js';
import { ERRORS, serveBadRequest, serveInternalServerError } from './resp/error.js';
import { serveData } from './resp/resp.js';

export class FinancialWizardController {
	private service: FinancialWizardService;
	private userService: UserService;

	constructor(service: FinancialWizardService, userService: UserService) {
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
	 * Saves Step 1: Financial Overview
	 * @param {Context} c - The Hono context containing financial overview data
	 * @returns {Promise<Response>} Response containing saved overview data
	 * @throws {Error} When saving financial overview fails
	 */
	public saveStep1 = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const body: FinancialOverviewBody = await c.req.json();
			const overview = await this.service.saveFinancialOverview(user.id, body);

			return serveData(c, {
				message: 'Financial overview saved successfully',
				overview,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Uploads a financial document
	 * @param {Context} c - The Hono context containing document upload data
	 * @returns {Promise<Response>} Response containing uploaded document data
	 * @throws {Error} When document upload fails
	 */
	public uploadDocument = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const body: FinancialDocumentBody = await c.req.json();
			const document = await this.service.uploadDocument(
				user.id,
				body.step,
				body.document_type,
				body.asset_id,
				body.notes,
			);

			return serveData(c, {
				message: 'Document uploaded successfully',
				document,
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
					message: 'No financial wizard progress found',
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
	 * Gets documents for a specific step
	 * @param {Context} c - The Hono context containing step parameter
	 * @returns {Promise<Response>} Response containing documents for the step
	 * @throws {Error} When document retrieval fails
	 */
	public getDocumentsByStep = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const step = Number.parseInt(c.req.param('step'));
			if (!step || step < 2 || step > 5) {
				return serveBadRequest(c, 'Invalid step number');
			}

			const documents = await this.service.getDocumentsByStep(user.id, step);

			return serveData(c, {
				documents,
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
				message: 'Financial wizard completed successfully',
				application,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Deletes a document
	 * @param {Context} c - The Hono context containing document ID parameter
	 * @returns {Promise<Response>} Response confirming document deletion
	 * @throws {Error} When document deletion fails
	 */
	public deleteDocument = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const documentId = Number.parseInt(c.req.param('id'));
			if (!documentId) {
				return serveBadRequest(c, 'Invalid document ID');
			}

			await this.service.deleteDocument(user.id, documentId);

			return serveData(c, {
				message: 'Document deleted successfully',
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};
}

