import { and, desc, eq, max } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type {
	NewFinancialDocument,
	NewFinancialOverview,
	NewFinancialStepFolder,
	NewFinancialWizardApplication,
	schema,
} from '../schema/schema.js';
import {
	businessSchema,
	financialDocumentSchema,
	financialOverviewSchema,
	financialStepFoldersSchema,
	financialWizardApplicationSchema,
	userSchema,
} from '../schema/schema.js';
import { FinancialWizardPage } from '../service/financial-wizard.js';

export class FinancialWizardRepository {
	private db: DrizzleD1Database<typeof schema>;

	constructor(db: DrizzleD1Database<typeof schema>) {
		this.db = db;
	}

	public async createApplication(application: NewFinancialWizardApplication) {
		const result = await this.db.insert(financialWizardApplicationSchema).values(application).returning();
		return await this.findApplicationById(result[0].id);
	}

	public async findApplicationById(id: number) {
		return this.db.query.financialWizardApplicationSchema.findFirst({
			where: eq(financialWizardApplicationSchema.id, id),
		});
	}

	public async findApplicationByUserId(userId: number) {
		return this.db.query.financialWizardApplicationSchema.findFirst({
			where: eq(financialWizardApplicationSchema.user_id, userId),
		});
	}

	public async findAllApplications() {
		return await this.db
			.select({
				id: financialWizardApplicationSchema.id,
				user_id: financialWizardApplicationSchema.user_id,
				current_page: financialWizardApplicationSchema.current_page,
				is_complete: financialWizardApplicationSchema.is_complete,
				first_name: userSchema.first_name,
				last_name: userSchema.last_name,
				email: userSchema.email,
			})
			.from(financialWizardApplicationSchema)
			.leftJoin(userSchema, eq(financialWizardApplicationSchema.user_id, userSchema.id));
	}

	public async updateApplication(id: number, application: Partial<NewFinancialWizardApplication>) {
		const { ...updateData } = application;
		await this.db.update(financialWizardApplicationSchema).set(updateData).where(eq(financialWizardApplicationSchema.id, id));
		return await this.findApplicationById(id);
	}

	public async upsertFinancialOverview(overview: NewFinancialOverview) {
		const existing = await this.db.query.financialOverviewSchema.findFirst({
			where: eq(financialOverviewSchema.application_id, overview.application_id),
		});

		if (existing) {
			const { ...updateData } = overview;
			await this.db.update(financialOverviewSchema).set(updateData).where(eq(financialOverviewSchema.id, existing.id));
			return await this.findFinancialOverviewByApplicationId(overview.application_id);
		}

		const result = await this.db.insert(financialOverviewSchema).values(overview).returning();
		return await this.findFinancialOverviewById(result[0].id);
	}

	public async findFinancialOverviewById(id: number) {
		return this.db.query.financialOverviewSchema.findFirst({
			where: eq(financialOverviewSchema.id, id),
		});
	}

	public async findFinancialOverviewByApplicationId(applicationId: number) {
		return this.db.query.financialOverviewSchema.findFirst({
			where: eq(financialOverviewSchema.application_id, applicationId),
		});
	}

	public async createDocument(document: NewFinancialDocument) {
		const maxVersionResult = await this.db
			.select({ maxVersion: max(financialDocumentSchema.version) })
			.from(financialDocumentSchema)
			.where(
				and(
					eq(financialDocumentSchema.application_id, document.application_id),
					eq(financialDocumentSchema.document_type, document.document_type),
				),
			);

		const nextVersion = (maxVersionResult[0]?.maxVersion || 0) + 1;

		await this.db
			.update(financialDocumentSchema)
			.set({ is_current: false })
			.where(
				and(
					eq(financialDocumentSchema.application_id, document.application_id),
					eq(financialDocumentSchema.document_type, document.document_type),
				),
			);

		const result = await this.db
			.insert(financialDocumentSchema)
			.values({
				...document,
				notes: document.notes,
				version: nextVersion,
				is_current: true,
			})
			.returning();

		return await this.findDocumentById(result[0].id);
	}

	public async findDocumentById(id: number) {
		return this.db.query.financialDocumentSchema.findFirst({
			where: eq(financialDocumentSchema.id, id),
		});
	}

	public async findDocumentsByApplicationId(applicationId: number, includeOldVersions = false) {
		const conditions = [eq(financialDocumentSchema.application_id, applicationId)];
		if (!includeOldVersions) {
			conditions.push(eq(financialDocumentSchema.is_current, true));
		}

		return this.db.query.financialDocumentSchema.findMany({
			where: and(...conditions),
			orderBy: [desc(financialDocumentSchema.created_at)],
		});
	}

	public async findCurrentDocumentByType(applicationId: number, documentType: NewFinancialDocument['document_type']) {
		return this.db.query.financialDocumentSchema.findFirst({
			where: and(
				eq(financialDocumentSchema.application_id, applicationId),
				eq(financialDocumentSchema.document_type, documentType),
				eq(financialDocumentSchema.is_current, true),
			),
		});
	}

	public async findDocumentsByPage(applicationId: number, page: FinancialWizardPage) {
		return this.db.query.financialDocumentSchema.findMany({
			where: and(
				eq(financialDocumentSchema.application_id, applicationId),
				eq(financialDocumentSchema.page, page),
				eq(financialDocumentSchema.is_current, true),
			),
			orderBy: [desc(financialDocumentSchema.created_at)],
		});
	}

	public async deleteDocument(id: number) {
		await this.db.update(financialDocumentSchema).set({ is_current: false }).where(eq(financialDocumentSchema.id, id));
	}

	/**
	 * Finds business by user ID (copied from BusinessRepository)
	 * @param {number} userId - ID of the user
	 * @returns {Promise<Business | undefined>} The business if found
	 */
	public async findBusinessByUserId(userId: number) {
		const result = await this.db.select().from(businessSchema).where(eq(businessSchema.user_id, userId)).limit(1);
		return result[0];
	}

	/**
	 * Insert Financial step folder
	 * @param {record} NewFinancialStepFolder - Record to be saved
	 * @returns {Reord : FinancialStepFolder} The business if found
	 */
	public async insertfinancialStepFolder(record: NewFinancialStepFolder) {
		const result = await this.db.insert(financialStepFoldersSchema).values(record).returning();
		return result[0];
	}
	/**
	 * Insert Financial step folder
	 * @param {record} NewFinancialStepFolder - Record to be saved
	 * @returns {Reord : FinancialStepFolder} The business if found
	 */
	public async findFolderIDByPageAndBusiness(
		page:
			| 'company-profile'
			| 'financial-overview'
			| 'financial-reports'
			| 'accounts-inventory'
			| 'ecommerce-performance'
			| 'team-ownership'
			| 'legal'
			| 'due-diligence'
			| 'financial-screener',
		business_id: number,
	) {
		const result = await this.db
			.select()
			.from(financialStepFoldersSchema)
			.where(and(eq(financialStepFoldersSchema.page, page), eq(financialStepFoldersSchema.business_id, business_id)))
			.limit(1);
		return result[0];
	}

	/**
	 * Insert multiple Financial Step Folders
	 * @param {NewFinancialStepFolder[]} records - Array of records to insert
	 * @returns {FinancialStepFolder[]} Array of inserted folders
	 */
	public async insertFinancialStepFolders(records: NewFinancialStepFolder[]) {
		if (!records || records.length === 0) return [];

		const result = await this.db.insert(financialStepFoldersSchema).values(records).returning();

		return result;
	}
}
