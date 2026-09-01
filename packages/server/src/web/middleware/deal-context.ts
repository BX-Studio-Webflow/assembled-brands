import { createMiddleware } from 'hono/factory';

import { logger } from '../../lib/logger.js';
import type { DealApplicationService } from '../../service/deal-application.js';

/**
 * Resolves deal context from the `X-Deal-Id` header (HubSpot deal object id) for logged-in users
 * who are acting on a deal they don't directly own — e.g. a team member working on the host's deal.
 *
 * Authorization: the resolved deal application must belong to the effective user, which is the team
 * host (set by `teamAccess` from `X-Team-Id`) when present, otherwise the caller themselves. When the
 * header is missing or fails authorization it is ignored, leaving deal context to come from the JWT.
 *
 * Must run after `authCheck` and `teamAccess`.
 */
export const dealContext = (dealApplicationService: DealApplicationService) =>
	createMiddleware(async (c, next) => {
		const header = c.req.header('X-Deal-Id');
		if (header) {
			const dealObjectId = Number(header);
			if (Number.isInteger(dealObjectId) && dealObjectId > 0) {
				const application = await dealApplicationService.findByHubspotDealObjectId(dealObjectId);
				if (application) {
					const hostId = c.get('hostId') as number | undefined;
					const payload = c.get('jwtPayload') as { sub?: number } | undefined;
					const effectiveUserId = hostId ?? payload?.sub;

					if (effectiveUserId && application.user_id === effectiveUserId) {
						c.set('dealApplicationId', application.id);
						c.set('dealId', dealObjectId);
					} else {
						logger.warn(
							{ dealObjectId, effectiveUserId, ownerId: application.user_id },
							'X-Deal-Id does not belong to the effective user; ignoring deal context header',
						);
					}
				}
			}
		}

		await next();
	});
