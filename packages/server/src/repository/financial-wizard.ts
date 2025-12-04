import { and, desc, eq, max } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type { NewFinancialDocument, NewFinancialOverview, NewFinancialWizardApplication, schema } from '../schema/schema.js';
import {
    financialDocumentSchema,
    financialOverviewSchema,
    financialWizardApplicationSchema,
} from '../schema/schema.js';

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

    public async updateApplication(id: number, application: Partial<NewFinancialWizardApplication>) {
        const { updated_at, ...updateData } = application;
        await this.db.update(financialWizardApplicationSchema).set(updateData).where(eq(financialWizardApplicationSchema.id, id));
        return await this.findApplicationById(id);
    }

    public async upsertFinancialOverview(overview: NewFinancialOverview) {
        const existing = await this.db.query.financialOverviewSchema.findFirst({
            where: eq(financialOverviewSchema.application_id, overview.application_id),
        });

        if (existing) {
            const { updated_at, ...updateData } = overview;
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
                    eq(financialDocumentSchema.document_type, document.document_type as any),
                ),
            );

        const result = await this.db
            .insert(financialDocumentSchema)
            .values({
                ...document,
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

    public async findCurrentDocumentByType(applicationId: number, documentType: string) {
        return this.db.query.financialDocumentSchema.findFirst({
            where: and(
                eq(financialDocumentSchema.application_id, applicationId),
                eq(financialDocumentSchema.document_type, documentType as any),
                eq(financialDocumentSchema.is_current, true),
            ),
        });
    }

    public async findDocumentsByStep(applicationId: number, step: number) {
        return this.db.query.financialDocumentSchema.findMany({
            where: and(
                eq(financialDocumentSchema.application_id, applicationId),
                eq(financialDocumentSchema.step, step),
                eq(financialDocumentSchema.is_current, true),
            ),
            orderBy: [desc(financialDocumentSchema.created_at)],
        });
    }

    public async deleteDocument(id: number) {
        await this.db.update(financialDocumentSchema).set({ is_current: false }).where(eq(financialDocumentSchema.id, id));
    }
}

