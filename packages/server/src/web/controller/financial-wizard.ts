import { env } from 'cloudflare:workers';
import type { Context } from 'hono';

import { logger } from '../../lib/logger.js';
import type { AssetService } from '../../service/asset.js';
import { BusinessService } from '../../service/business.js';
import { FinancialWizardPage, FinancialWizardService } from '../../service/financial-wizard.js';
import type { UserService } from '../../service/user.js';
import type { FinancialDocumentBody, FinancialOverviewBody, UpdatePageBody } from '../validator/financial-wizard.js';
import { ERRORS, serveBadRequest, serveInternalServerError } from './resp/error.js';
import { serveData } from './resp/resp.js';

export class FinancialWizardController {
	private service: FinancialWizardService;
	private userService: UserService;
	private assetService: AssetService;
	private businessService: BusinessService;
	constructor(service: FinancialWizardService, userService: UserService, assetService: AssetService, businessService: BusinessService) {
		this.service = service;
		this.userService = userService;
		this.assetService = assetService;
		this.businessService = businessService;
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
			const document = await this.service.uploadDocument(user.id, body.page, body.document_type, body.asset_id, body.notes);

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
				...progress,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Gets documents for a specific page
	 * @param {Context} c - The Hono context containing page parameter
	 * @returns {Promise<Response>} Response containing documents for the page
	 * @throws {Error} When document retrieval fails
	 */
	public getDocumentsByPage = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const page = c.req.param('page') as FinancialWizardPage;
			const validPages = [
				'company-profile',
				'financial-overview',
				'financial-reports',
				'accounts-inventory',
				'ecommerce-performance',
				'team-ownership',
			];
			if (!page || !validPages.includes(page)) {
				return serveBadRequest(c, 'Invalid page identifier');
			}

			const application = await this.service.findByUserId(user.id);
			if (!application) {
				return serveBadRequest(c, "Ops, we can't find your application. Have you started it yet?");
			}

			const documents = await this.service.getDocumentsByPage(user.id, page);

			return serveData(c, {
				documents,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Updates the current page
	 * @param {Context} c - The Hono context containing page update data
	 * @returns {Promise<Response>} Response containing updated application data
	 * @throws {Error} When page update fails
	 */
	public updatePage = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const application = await this.service.findByUserId(user.id);
			if (!application) {
				return serveBadRequest(c, "Ops, we can't find your application. Have you started it yet?");
			}

			const body: UpdatePageBody = await c.req.json();
			const updatedApplication = await this.service.updatePage(user.id, body.page);

			return serveData(c, {
				message: 'Page updated successfully',
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

			const application = await this.service.findByUserId(user.id);
			if (!application) {
				return serveBadRequest(c, "Ops, we can't find your application. Have you started it yet?");
			}

			const completedApplication = await this.service.completeApplication(user.id);

			return serveData(c, {
				message: 'Financial wizard completed successfully',
				application: completedApplication,
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

			const application = await this.service.findByUserId(user.id);
			if (!application) {
				return serveBadRequest(c, "Ops, we can't find your application. Have you started it yet?");
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

	/**
	 * Test endpoint to upload a file to Google Drive
	 * @param {Context} c - The Hono context containing file upload
	 * @returns {Promise<Response>} Response containing uploaded file information
	 * @throws {Error} When upload fails
	 */
	public testGoogleDrive = async (c: Context) => {
		try {
			if (!env.GOOGLE_CLIENT_EMAIL || !env.GOOGLE_PRIVATE_KEY) {
				return serveBadRequest(c, 'Google client email or private key not set');
			}

			// Get the file from the request
			const formData = await c.req.formData();
			const file = formData.get('file') as File | null;

			if (!file) {
				return serveBadRequest(c, 'No file provided. Please send a file with the key "file"');
			}

			// Get file data
			const fileData = await file.arrayBuffer();
			const fileName = file.name || 'uploaded-file';
			const mimeType = file.type || 'application/octet-stream';

			// Upload to Google Drive using asset service
			const folderId = env.GOOGLE_DRIVE_FOLDER_ID || undefined;
			const uploadedFile = await this.assetService.uploadToGoogleDrive(fileData, fileName, mimeType, folderId);

			return serveData(c, {
				message: 'File uploaded to Google Drive successfully',
				file: {
					id: uploadedFile.id,
					name: uploadedFile.name,
					webViewLink: uploadedFile.webViewLink,
				},
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};
}
