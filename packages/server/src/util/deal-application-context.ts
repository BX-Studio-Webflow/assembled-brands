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

/**
 * Returns the deal application id for the request.
 * Prefers the warm-lead JWT (email-link flow); falls back to context set by the `dealContext`
 * middleware from the `X-Deal-Id` header (logged-in team-member flow). Undefined for cold-lead tokens.
 */
export function getDealApplicationIdFromContext(c: Context): number | undefined {
	const fromJwt = getDealContextFromJwt(c)?.dealApplicationId;
	if (typeof fromJwt === 'number') {
		return fromJwt;
	}

	const fromHeader = c.get('dealApplicationId') as number | undefined;
	return typeof fromHeader === 'number' ? fromHeader : undefined;
}

export function requireDealContextFromContext(c: Context): DealContext {
	const context = getDealContextFromJwt(c);
	if (!context) {
		throw new Error('JWT is missing required deal_id or deal_application_id');
	}
	return context;
}
