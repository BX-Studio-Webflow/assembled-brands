import { env } from 'process';

import { logger } from '../lib/logger.ts';
import type { OnboardingApplication } from '../schema/schema.ts';
import type { User } from '../schema/schema.ts';

const HUBSPOT_API_URL = 'https://api.hubapi.com/crm/v3/objects/contacts';

export interface HubSpotContactProperties {
	email: string;
	firstname?: string;
	lastname?: string;
	phone?: string;
	website?: string;
	company?: string;
	// Custom properties
	legal_name?: string;
	employee_count?: string;
	years_in_business?: string;
	asset_type?: string;
	desired_loan_amount?: string;
	company_type?: string;
	company_type_other?: string;
	revenue_qualification?: string;
	loan_urgency?: string;
	qualification_status?: string;
	rejection_reason?: string;
}

/**
 * Service class for managing HubSpot CRM operations
 */
export class HubSpotService {
	private apiKey: string;

	constructor() {
		this.apiKey = env.HUBSPOT_API_KEY || '';
		if (!this.apiKey) {
			logger.warn('HubSpot API key not configured');
		}
	}

	/**
	 * Creates or updates a contact in HubSpot
	 * @param {HubSpotContactProperties} properties - Contact properties to send
	 * @returns {Promise<{id: string}>} HubSpot contact ID
	 * @throws {Error} When HubSpot API call fails
	 */
	public async createOrUpdateContact(properties: HubSpotContactProperties): Promise<{ id: string }> {
		if (!this.apiKey) {
			logger.warn('HubSpot API key not configured, skipping contact creation');
			throw new Error('HubSpot API key not configured');
		}

		try {
			const response = await fetch(HUBSPOT_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: JSON.stringify({
					properties: properties,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				logger.error({ error }, 'HubSpot API error');
				throw new Error(`HubSpot API error: ${JSON.stringify(error)}`);
			}

			const result = (await response.json()) as { id: string };
			logger.info(`Contact created/updated in HubSpot: ${result.id}`);
			return result;
		} catch (error) {
			logger.error(error);
			throw error;
		}
	}

	/**
	 * Sends disqualified lead data to HubSpot
	 * @param {User} user - User data
	 * @param {OnboardingApplication} application - Onboarding application data
	 * @returns {Promise<{id: string}>} HubSpot contact ID
	 * @throws {Error} When HubSpot API call fails
	 */
	public async sendDisqualifiedLead(user: User, application: OnboardingApplication): Promise<{ id: string }> {
		const properties: HubSpotContactProperties = {
			email: user.email,
			firstname: user.first_name || undefined,
			lastname: user.last_name || undefined,
			phone: user.phone || undefined,
			website: application.website || undefined,
			company: application.legal_name || undefined,
			legal_name: application.legal_name || undefined,
			employee_count: application.employee_count || undefined,
			years_in_business: application.years_in_business || undefined,
			asset_type: application.asset_type || undefined,
			desired_loan_amount: application.desired_loan_amount || undefined,
			company_type: application.company_type || undefined,
			company_type_other: application.company_type_other || undefined,
			revenue_qualification: application.revenue_qualification || undefined,
			loan_urgency: user.loan_urgency || undefined,
			qualification_status: 'disqualified',
			rejection_reason: application.rejection_reason || undefined,
		};

		// Remove undefined values
		Object.keys(properties).forEach((key) => {
			if (properties[key as keyof HubSpotContactProperties] === undefined) {
				delete properties[key as keyof HubSpotContactProperties];
			}
		});

		return this.createOrUpdateContact(properties);
	}
}
