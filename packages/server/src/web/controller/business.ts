import type { Context } from 'hono';

import { logger } from '../../lib/logger.js';
import { BusinessService } from '../../service/business.js';
import type { UserService } from '../../service/user.js';
import { getDealApplicationIdFromContext } from '../../util/deal-application-context.js';
import { type BusinessBody } from '../validator/business.js';
import { ERRORS, serveBadRequest, serveInternalServerError } from './resp/error.js';

export class BusinessController {
	private service: BusinessService;
	private userService: UserService;

	constructor(service: BusinessService, userService: UserService) {
		this.service = service;
		this.userService = userService;
	}

	private async getUser(c: Context) {
		const { email } = c.get('jwtPayload');
		const user = await this.userService.findByEmail(email);
		return user;
	}

	public getMyBusiness = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const dealApplicationId = getDealApplicationIdFromContext(c);
			const business = dealApplicationId
				? await this.service.getBusinessByDealApplicationId(dealApplicationId)
				: await this.service.getBusinessByUserId(user.id);

			return c.json({
				business,
				user: {
					email: user.email,
					first_name: user.first_name,
					last_name: user.last_name,
					phone: user.phone,
					dial_code: user.dial_code,
					role: user.role,
					subscription_status: user.subscription_status,
					profile_picture: user.profile_picture,
					bio: user.bio,
					auth_provider: user.auth_provider,
					authority: [],
					createdAt: user.createdAt,
					is_verified: user.is_verified,
					subscription_product: user.subscription_product,
				},
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	public upsertBusiness = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const body: BusinessBody = await c.req.json();
			const dealApplicationId = getDealApplicationIdFromContext(c);
			const business = await this.service.upsertBusiness(
				user.id,
				{
					...body,
					user_id: user.id,
				},
				dealApplicationId ? { dealApplicationId } : undefined,
			);

			return c.json({
				message: 'Business information saved successfully',
				business,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	public getAllBusinesses = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			if (user.role !== 'admin' && user.role !== 'super-admin') {
				return serveBadRequest(c, ERRORS.NOT_ALLOWED);
			}

			const { page, limit, search } = c.req.query();
			const query = {
				page: page ? Number.parseInt(page) : 1,
				limit: limit ? Number.parseInt(limit) : 10,
				search,
			};

			const businesses = await this.service.getAllBusinesses(query);
			return c.json(businesses);
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};
}
