import type { Context } from 'hono';

import { logger } from '../../lib/logger.js';
import type { DealApplicationService } from '../../service/deal-application.js';
import type { UserService } from '../../service/user.js';
import { ERRORS, serveBadRequest, serveInternalServerError } from './resp/error.js';
import { serveData } from './resp/resp.js';

export class DealApplicationController {
	private service: DealApplicationService;
	private userService: UserService;

	constructor(service: DealApplicationService, userService: UserService) {
		this.service = service;
		this.userService = userService;
	}

	private async getUser(c: Context) {
		const { email } = c.get('jwtPayload');
		return this.userService.findByEmail(email);
	}

	public listMine = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const applications = await this.service.listForUser(user.id);
			return serveData(c, {
				applications: applications.map((application) => ({
					id: application.id,
					deal_id: application.hubspot_deal_object_id,
					legal_name: application.legal_name,
					application_link: application.application_link,
					status: application.status,
					created_at: application.created_at,
					updated_at: application.updated_at,
				})),
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};
}
