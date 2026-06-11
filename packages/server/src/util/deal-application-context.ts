import type { Context } from 'hono';

import type { WarmLeadJWTPayload } from '../lib/jwt.js';

export type DealContext = {
	dealId: number;
	dealApplicationId: number;
};

export function getDealContextFromJwt(c: Context): DealContext | undefined {
	const payload = c.get('jwtPayload') as WarmLeadJWTPayload | undefined;
	const dealId = payload?.deal_id;
	const dealApplicationId = payload?.deal_application_id;
	if (
		typeof dealId !== 'number' ||
		!Number.isFinite(dealId) ||
		typeof dealApplicationId !== 'number' ||
		!Number.isFinite(dealApplicationId)
	) {
		return undefined;
	}
	return { dealId, dealApplicationId };
}

/** Returns deal context for warm-lead JWTs; undefined for cold-lead auth tokens. */
export function getDealApplicationIdFromContext(c: Context): number | undefined {
	return getDealContextFromJwt(c)?.dealApplicationId;
}

export function requireDealContextFromContext(c: Context): DealContext {
	const context = getDealContextFromJwt(c);
	if (!context) {
		throw new Error('JWT is missing required deal_id or deal_application_id');
	}
	return context;
}
