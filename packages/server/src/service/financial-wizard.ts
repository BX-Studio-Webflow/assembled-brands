import { logger } from '../lib/logger.ts';
import type { FinancialWizardRepository } from '../repository/financial-wizard.ts';
import { type NewFinancialDocument } from '../schema/index.ts';
import type { FinancialOverviewBody, FinancialWizardProgressResponse } from '../web/validator/financial-wizard.ts';
import type { AssetService } from './asset.js';

/**
 * Page order for progress calculation
 */
const PAGE_ORDER = [
	'company-profile',
	'financial-overview',
	'financial-reports',
	'accounts-inventory',
	'ecommerce-performance',
	'team-ownership',
] as const;

export type FinancialWizardPage = (typeof PAGE_ORDER)[number];

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
					current_page: 'company-profile',
					is_complete: false,
				});
				if (!application) {
					throw new Error('Failed to create application');
				}
			}
			return application;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Finds application by user ID
	 * @param {number} userId - ID of the user
	 * @returns {Promise<FinancialWizardApplication | undefined>} The application if found
	 * @throws {Error} When application retrieval fails
	 */
	public async findByUserId(userId: number) {
		try {
			return await this.repo.findApplicationByUserId(userId);
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
			if (!application) {
				throw new Error('Application not found');
			}
			const overview = await this.repo.upsertFinancialOverview({
				application_id: application.id,
				revenue_last_12_months: data.revenue_last_12_months,
				net_income_last_12_months: data.net_income_last_12_months,
				projected_revenue_next_12_months: data.projected_revenue_next_12_months,
			});

			await this.repo.updateApplication(application.id, {
				current_page: 'financial-overview',
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
	 * @param {string} page - Page identifier
	 * @param {NewFinancialDocument['document_type']} documentType - Type of document
	 * @param {number} assetId - ID of the uploaded asset
	 * @param {string} [notes] - Optional notes about the document
	 * @returns {Promise<FinancialDocument>} The created document
	 * @throws {Error} When document upload fails or asset access is denied
	 */
	public async uploadDocument(
		userId: number,
		page: string,
		documentType: NewFinancialDocument['document_type'],
		assetId: number,
		notes: string,
	) {
		try {
			const application = await this.getOrCreateApplication(userId);

			const asset = await this.assetService.getAsset(assetId);
			if (!asset || asset.user_id !== userId) {
				throw new Error('Asset not found or access denied');
			}
			const document = await this.repo.createDocument({
				application_id: application.id,
				asset_id: assetId,
				page: page as FinancialWizardPage,
				document_type: documentType,
				notes: notes,
			});

			// Update current_page to the highest page in order
			const currentPageIndex = PAGE_ORDER.indexOf(application.current_page as FinancialWizardPage);
			const newPageIndex = PAGE_ORDER.indexOf(page as FinancialWizardPage);
			if (newPageIndex > currentPageIndex) {
				await this.repo.updateApplication(application.id, {
					current_page: page as FinancialWizardPage,
				});
			}

			return document;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Calculates the percentage progress based on completion status
	 * @param {boolean} isComplete - Whether the application is marked as complete
	 * @param {Object | null} business - Business/company profile data (required for calculation)
	 * @param {Object | null} financialOverview - Financial overview data
	 * @param {Record<string, Array>} documentsByPage - Documents grouped by page
	 * @returns {number} Percentage completion (0-100)
	 */
	private calculatePercentage(
		isComplete: boolean,
		business: { id: number } | null,
		financialOverview: { revenue_last_12_months: string | null } | null,
		documentsByPage: Record<string, Array<unknown>>,
	): number {
		if (isComplete) {
			return 100;
		}

		const totalPages = PAGE_ORDER.length;
		let completedPages = 0;

		// Check company-profile completion
		if (business) {
			completedPages += 1;
		}

		// Check financial-overview completion
		if (financialOverview) {
			completedPages += 1;
		}

		// Check document pages completion
		const documentPages = ['financial-reports', 'accounts-inventory', 'ecommerce-performance', 'team-ownership'];
		for (const page of documentPages) {
			if (documentsByPage[page] && documentsByPage[page].length > 0) {
				completedPages += 1;
			}
		}

		return Math.round((completedPages / totalPages) * 100);
	}

	/**
	 * Gets current progress for a user
	 * @param {number} userId - ID of the user
	 * @returns {Promise<FinancialWizardProgressResponse | null>} The progress data or null if not found
	 * @throws {Error} When progress retrieval fails
	 */
	public async getProgress(userId: number): Promise<FinancialWizardProgressResponse | null> {
		try {
			const [application, business] = await Promise.all([
				this.repo.findApplicationByUserId(userId),
				this.repo.findBusinessByUserId(userId),
			]);

			if (!application) {
				return null;
			}

			const [overview, documents] = await Promise.all([
				this.repo.findFinancialOverviewByApplicationId(application.id),
				this.repo.findDocumentsByApplicationId(application.id, false),
			]);

			// Collect all unique asset IDs and fetch them in parallel
			const uniqueAssetIds = [...new Set(documents.map((doc) => doc.asset_id))];
			const assets = await Promise.all(uniqueAssetIds.map((assetId) => this.assetService.getAsset(assetId)));

			// Create a map of asset_id -> asset for quick lookup
			const assetMap = new Map<number, (typeof assets)[0]>();
			assets.forEach((asset, index) => {
				if (asset) {
					assetMap.set(uniqueAssetIds[index], asset);
				}
			});

			// Group documents by page and enrich with asset data
			const documentsByPage: Record<string, typeof documents> = {};
			for (const doc of documents) {
				const page = doc.page || 'financial-reports';
				if (!documentsByPage[page]) {
					documentsByPage[page] = [];
				}
				documentsByPage[page].push(doc);
			}

			const enrichedDocumentsByPage: Record<
				string,
				Array<{
					id: number;
					application_id: number;
					asset_id: number;
					page: string;
					document_type: string;
					is_current: boolean;
					version: number;
					notes: string | null;
					created_at: Date | null;
					updated_at: Date | null;
					asset_url: string | null;
					asset_name: string | null;
				}>
			> = {};
			for (const [page, docs] of Object.entries(documentsByPage)) {
				enrichedDocumentsByPage[page] = docs.map((doc) => {
					const asset = assetMap.get(doc.asset_id);
					return {
						...doc,
						is_current: doc.is_current ?? false,
						version: doc.version ?? 1,
						asset_url: asset?.asset_url || null,
						asset_name: asset?.asset_name || null,
					};
				});
			}

			const currentPage = (application.current_page || 'company-profile') as FinancialWizardPage;
			const financialOverviewData = overview
				? {
						revenue_last_12_months: overview.revenue_last_12_months || null,
						net_income_last_12_months: overview.net_income_last_12_months || null,
						projected_revenue_next_12_months: overview.projected_revenue_next_12_months || null,
					}
				: null;

			// Calculate percentage based on actual completion status
			const percentage = this.calculatePercentage(
				application.is_complete || false,
				business || null,
				financialOverviewData,
				enrichedDocumentsByPage,
			);

			return {
				current_page: currentPage,
				is_complete: application.is_complete || false,
				company_profile: business || null,
				financial_overview: financialOverviewData,
				percentage,
				financial_reports: enrichedDocumentsByPage['financial-reports'] || [],
				accounts_inventory: enrichedDocumentsByPage['accounts-inventory'] || [],
				ecommerce_performance: enrichedDocumentsByPage['ecommerce-performance'] || [],
				team_ownership: enrichedDocumentsByPage['team-ownership'] || [],
				business,
			};
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Updates application page
	 * @param {number} userId - ID of the user
	 * @param {string} page - Page identifier to update to
	 * @returns {Promise<FinancialWizardApplication>} The updated application
	 * @throws {Error} When page update fails or application not found
	 */
	public async updatePage(userId: number, page: string) {
		try {
			const application = await this.repo.findApplicationByUserId(userId);
			if (!application) {
				throw new Error('Application not found');
			}

			return await this.repo.updateApplication(application.id, {
				current_page: page as FinancialWizardPage,
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
	 * Gets documents for a specific page
	 * @param {number} userId - ID of the user
	 * @param {string} page - Page identifier
	 * @returns {Promise<Array>} List of documents with asset URLs
	 * @throws {Error} When document retrieval fails
	 */
	public async getDocumentsByPage(userId: number, page: FinancialWizardPage) {
		try {
			const application = await this.repo.findApplicationByUserId(userId);
			if (!application) {
				throw new Error('Application not found');
			}

			const documents = await this.repo.findDocumentsByPage(application.id, page);

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
	 * Tracks business profile completion
	 * @param {number} userId - ID of the user
	 * @returns {Promise<void>}
	 * @throws {Error} When tracking fails
	 */
	public async trackBusinessProfile(userId: number): Promise<void> {
		try {
			const application = await this.getOrCreateApplication(userId);
			if (!application) {
				throw new Error('Application not found');
			}

			// Update to company-profile page if not already at a later page
			const currentPageIndex = PAGE_ORDER.indexOf(application.current_page as FinancialWizardPage);
			const companyProfileIndex = PAGE_ORDER.indexOf('company-profile');
			if (currentPageIndex < companyProfileIndex) {
				await this.repo.updateApplication(application.id, {
					current_page: 'company-profile',
				});
			}
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
