import { logger } from '../lib/logger.ts';
import type { FinancialWizardRepository } from '../repository/financial-wizard.ts';
import type { AssetService } from './asset.js';
import type {
	FinancialDocumentBody,
	FinancialOverviewBody,
	FinancialWizardProgressResponse,
} from '../web/validator/financial-wizard.ts';

/**
 * Service class for managing financial wizard operations
 */
export class FinancialWizardService {
	private repo: FinancialWizardRepository;
	private assetService: AssetService;

	constructor(repo: FinancialWizardRepository, assetService: AssetService) {
		this.repo = repo;
		this.assetService = assetService;
	}

	/**
	 * Initializes or retrieves financial wizard application for a user
	 * @param {number} userId - ID of the user
	 * @returns {Promise<FinancialWizardApplication>} The financial wizard application
	 * @throws {Error} When application creation or retrieval fails
	 */
	public async getOrCreateApplication(userId: number) {
		try {
			let application = await this.repo.findApplicationByUserId(userId);
			if (!application) {
				application = await this.repo.createApplication({
					user_id: userId,
					current_step: 1,
					is_complete: false,
				});
			}
			return application;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Saves Step 1: Financial Overview
	 * @param {number} userId - ID of the user
	 * @param {FinancialOverviewBody} data - Financial overview data
	 * @returns {Promise<FinancialOverview>} The saved financial overview
	 * @throws {Error} When saving financial overview fails
	 */
	public async saveFinancialOverview(userId: number, data: FinancialOverviewBody) {
		try {
			const application = await this.getOrCreateApplication(userId);

			const overview = await this.repo.upsertFinancialOverview({
				application_id: application.id,
				revenue_last_12_months: data.revenue_last_12_months,
				net_income_last_12_months: data.net_income_last_12_months,
				projected_revenue_next_12_months: data.projected_revenue_next_12_months,
			});

			await this.repo.updateApplication(application.id, {
				current_step: Math.max(application.current_step || 1, 1),
			});

			return overview;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Uploads a financial document
	 * @param {number} userId - ID of the user
	 * @param {number} step - Step number (2-5)
	 * @param {string} documentType - Type of document
	 * @param {number} assetId - ID of the uploaded asset
	 * @param {string} [notes] - Optional notes about the document
	 * @returns {Promise<FinancialDocument>} The created document
	 * @throws {Error} When document upload fails or asset access is denied
	 */
	public async uploadDocument(userId: number, step: number, documentType: string, assetId: number, notes?: string) {
		try {
			const application = await this.getOrCreateApplication(userId);

			const asset = await this.assetService.getAsset(assetId);
			if (!asset || asset.user_id !== userId) {
				throw new Error('Asset not found or access denied');
			}

			const document = await this.repo.createDocument({
				application_id: application.id,
				asset_id: assetId,
				step,
				document_type: documentType as any,
				notes: notes || null,
			});

			await this.repo.updateApplication(application.id, {
				current_step: Math.max(application.current_step || 1, step),
			});

			return document;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Gets current progress for a user
	 * @param {number} userId - ID of the user
	 * @returns {Promise<FinancialWizardProgressResponse | null>} The progress data or null if not found
	 * @throws {Error} When progress retrieval fails
	 */
	public async getProgress(userId: number): Promise<FinancialWizardProgressResponse | null> {
		try {
			const application = await this.repo.findApplicationByUserId(userId);
			if (!application) {
				return null;
			}

			const overview = await this.repo.findFinancialOverviewByApplicationId(application.id);
			const documents = await this.repo.findDocumentsByApplicationId(application.id, false);

			const documentsByStep: Record<number, typeof documents> = {};
			for (const doc of documents) {
				if (!documentsByStep[doc.step]) {
					documentsByStep[doc.step] = [];
				}
				documentsByStep[doc.step].push(doc);
			}

			const enrichedDocumentsByStep: Record<number, any[]> = {};
			for (const [step, docs] of Object.entries(documentsByStep)) {
				enrichedDocumentsByStep[Number(step)] = await Promise.all(
					docs.map(async (doc) => {
						const asset = await this.assetService.getAsset(doc.asset_id);
						return {
							...doc,
							asset_url: asset?.asset_url || null,
							asset_name: asset?.asset_name || null,
						};
					}),
				);
			}

			return {
				current_step: application.current_step || 1,
				is_complete: application.is_complete || false,
				step1: overview
					? {
							revenue_last_12_months: overview.revenue_last_12_months || null,
							net_income_last_12_months: overview.net_income_last_12_months || null,
							projected_revenue_next_12_months: overview.projected_revenue_next_12_months || null,
						}
					: null,
				step2: enrichedDocumentsByStep[2] || [],
				step3: enrichedDocumentsByStep[3] || [],
				step4: enrichedDocumentsByStep[4] || [],
				step5: enrichedDocumentsByStep[5] || [],
			};
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Updates application step
	 * @param {number} userId - ID of the user
	 * @param {number} step - Step number to update to
	 * @returns {Promise<FinancialWizardApplication>} The updated application
	 * @throws {Error} When step update fails or application not found
	 */
	public async updateStep(userId: number, step: number) {
		try {
			const application = await this.repo.findApplicationByUserId(userId);
			if (!application) {
				throw new Error('Application not found');
			}

			return await this.repo.updateApplication(application.id, {
				current_step: step,
			});
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Marks application as complete
	 * @param {number} userId - ID of the user
	 * @returns {Promise<FinancialWizardApplication>} The updated application
	 * @throws {Error} When completion fails or application not found
	 */
	public async completeApplication(userId: number) {
		try {
			const application = await this.repo.findApplicationByUserId(userId);
			if (!application) {
				throw new Error('Application not found');
			}

			return await this.repo.updateApplication(application.id, {
				is_complete: true,
			});
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Gets documents for a specific step
	 * @param {number} userId - ID of the user
	 * @param {number} step - Step number (2-5)
	 * @returns {Promise<Array>} List of documents with asset URLs
	 * @throws {Error} When document retrieval fails
	 */
	public async getDocumentsByStep(userId: number, step: number) {
		try {
			const application = await this.repo.findApplicationByUserId(userId);
			if (!application) {
				return [];
			}

			const documents = await this.repo.findDocumentsByStep(application.id, step);

			const enrichedDocuments = await Promise.all(
				documents.map(async (doc) => {
					const asset = await this.assetService.getAsset(doc.asset_id);
					return {
						...doc,
						asset_url: asset?.asset_url || null,
						asset_name: asset?.asset_name || null,
					};
				}),
			);

			return enrichedDocuments;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Deletes a document
	 * @param {number} userId - ID of the user
	 * @param {number} documentId - ID of the document to delete
	 * @returns {Promise<void>}
	 * @throws {Error} When document deletion fails, document not found, or access denied
	 */
	public async deleteDocument(userId: number, documentId: number): Promise<void> {
		try {
			const application = await this.repo.findApplicationByUserId(userId);
			if (!application) {
				throw new Error('Application not found');
			}

			const document = await this.repo.findDocumentById(documentId);
			if (!document || document.application_id !== application.id) {
				throw new Error('Document not found or access denied');
			}

			await this.repo.deleteDocument(documentId);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}
}

