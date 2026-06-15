import { env } from 'cloudflare:workers';

import { logger } from '../lib/logger.js';
import { BusinessRepository } from '../repository/business.ts';
import { NewFinancialStepFolder } from '../schema/schema.ts';
import { buildCompanyDriveFolderName } from '../util/drive-naming.ts';
import type { BusinessBody, BusinessQuery } from '../web/validator/business.ts';
import type { AssetService } from './asset.js';
import type { FinancialWizardService } from './financial-wizard.ts';
import type { S3Service } from './s3.js';
import type { SlackNotifierService } from './slack-notifier.ts';
import type { TeamService } from './team.ts';

/**
 * Service class for managing business profiles and related operations
 */
export class BusinessService {
	private repository: BusinessRepository;
	private s3Service: S3Service;
	private assetService: AssetService;
	private teamService: TeamService;
	private financialWizardService: FinancialWizardService;
	private slackNotifierService?: SlackNotifierService;

	constructor(
		repository: BusinessRepository,
		s3Service: S3Service,
		assetService: AssetService,
		teamService: TeamService,
		financialWizardService: FinancialWizardService,
		slackNotifierService?: SlackNotifierService,
	) {
		this.repository = repository;
		this.s3Service = s3Service;
		this.assetService = assetService;
		this.teamService = teamService;
		this.financialWizardService = financialWizardService;
		this.slackNotifierService = slackNotifierService;
	}

	public async getBusinessDetailsByUserId(userId: number) {
		return this.repository.findByUserId(userId);
	}

	public async getBusinessByDealApplicationId(dealApplicationId: number) {
		try {
			const business = await this.repository.findByDealApplicationId(dealApplicationId);
			if (!business) return business;

			const team = await this.teamService.getTeamByHostId(business.user_id);
			return {
				...business,
				teamDetails: {
					...team,
					user: { email: team?.user?.email, first_name: team?.user?.first_name, last_name: team?.user?.last_name },
				},
			};
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	public async getBusinessByUserId(userId: number) {
		try {
			const business = await this.repository.findByUserId(userId);
			if (!business) return business;

			const team = await this.teamService.getTeamByHostId(userId);
			return {
				...business,
				teamDetails: {
					...team,
					user: { email: team?.user?.email, first_name: team?.user?.first_name, last_name: team?.user?.last_name },
				},
			};
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	public async getAllBusinesses(query?: BusinessQuery) {
		try {
			return await this.repository.findAll(query);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	public async upsertBusiness(userId: number, business: BusinessBody, options?: { dealName?: string | null; dealApplicationId?: number }) {
		try {
			const existingBusiness = options?.dealApplicationId
				? await this.repository.findByDealApplicationId(options.dealApplicationId)
				: await this.repository.findByUserId(userId);

			const businessData = {
				...business,
				...(business.inventory_location !== undefined && {
					international_location: business.inventory_location === 'International' ? business.international_location?.trim() || null : null,
				}),
				user_id: userId,
				...(options?.dealApplicationId != null ? { deal_application_id: options.dealApplicationId } : {}),
			};

			if (existingBusiness) {
				await this.repository.update(existingBusiness.id, businessData);
			} else {
				const parentFolderName = buildCompanyDriveFolderName(businessData.legal_name, options?.dealName);
				const company_folder_id = await this.assetService.CreateFolder(parentFolderName, env.GOOGLE_DRIVE_FOLDER_ID, {
					preserveDisplayFormat: true,
				});

				const pages = [
					'financial-reports',
					'forecasts',
					'accounts-inventory',
					'ecommerce-performance',
					'team-ownership',
					'optional-docs',
					'legal',
					'due-diligence',
					'financial-screener',
				];
				const folderPromises = pages.map((page) => this.assetService.CreateFolder(page, company_folder_id));
				const folderIds = await Promise.all(folderPromises);

				const pageFolderMap: Record<string, string> = {};
				pages.forEach((page, i) => {
					pageFolderMap[page] = folderIds[i];
				});

				const businessRecord = await Promise.all([
					this.repository.create({
						...businessData,
						folder_id: company_folder_id,
					}),
					this.teamService.createTeam(business.legal_name, userId),
				]);

				const stepFolderRecords: NewFinancialStepFolder[] = Object.entries(pageFolderMap).map(([page, folder_id]) => ({
					user_id: userId,
					business_id: businessRecord[0].id,
					page: page as NewFinancialStepFolder['page'],
					folder_id,
				}));

				await Promise.all([
					this.financialWizardService.insertFinancialStepFolders(stepFolderRecords),
					this.financialWizardService.trackBusinessProfile(userId, options?.dealApplicationId),
				]);

				void this.slackNotifierService?.sendGoogleDriveFolderCreated({
					legalName: businessData.legal_name,
					folderId: company_folder_id,
					folderName: parentFolderName,
					dealApplicationId: options?.dealApplicationId,
				});
			}

			if (options?.dealApplicationId) {
				const updated = await this.repository.findByDealApplicationId(options.dealApplicationId);
				if (!updated) {
					throw new Error('Business not found after upsert');
				}
				return updated;
			}

			return await this.getBusinessByUserId(userId);
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}
}
