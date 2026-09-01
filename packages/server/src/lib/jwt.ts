import { sign, verify } from 'hono/jwt';
import { env } from 'process';

type JWTPayload = {
	[key: string]: unknown;
	sub?: number;
	email?: string;
	deal_id?: number;
	deal_application_id?: number;
	exp?: number;
};

type WarmLeadJWTPayload = JWTPayload & {
	sub: number;
	email: string;
	deal_id: number;
	deal_application_id: number;
	exp: number;
};

/**
 * Encodes a warm-lead session JWT. Deal context is required.
 */
const encode = async (id: number, email: string, dealId: number, dealApplicationId: number): Promise<string> => {
	const payload: WarmLeadJWTPayload = {
		sub: id,
		email,
		deal_id: dealId,
		deal_application_id: dealApplicationId,
		exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Token expires in 30 days
	};
	return await sign(payload, env.SECRET_KEY);
};

/**
 * Encodes a cold-lead auth JWT without deal context.
 */
const encodeAuth = async (id: number, email: string): Promise<string> => {
	const payload: JWTPayload = {
		sub: id,
		email,
		exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
	};
	return await sign(payload, env.SECRET_KEY);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const check = async (token: string): Promise<JWTPayload> => {
	return await verify(token, env.SECRET_KEY);
};

type InviteTokenPayload = JWTPayload & { invitation_id: number; purpose: 'team_invite'; exp: number };

/**
 * Signs a short-lived token that authorizes accepting a specific team
 * invitation via magic link (prevents invitation-id enumeration).
 */
const encodeInviteToken = async (invitationId: number, ttlDays = 14): Promise<string> => {
	const payload: InviteTokenPayload = {
		invitation_id: invitationId,
		purpose: 'team_invite',
		exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * ttlDays,
	};
	return await sign(payload, env.SECRET_KEY);
};

/** Verifies an invite token and returns its invitation id, or null if invalid/expired. */
const decodeInviteToken = async (token: string): Promise<number | null> => {
	try {
		const payload = (await verify(token, env.SECRET_KEY)) as InviteTokenPayload;
		if (payload.purpose !== 'team_invite' || typeof payload.invitation_id !== 'number') {
			return null;
		}
		return payload.invitation_id;
	} catch {
		return null;
	}
};

type WarmLeadTokenPayload = JWTPayload & { deal_id: number; purpose: 'warm_lead'; exp?: number };

/**
 * Signs a token that authorizes starting/resuming a specific warm-lead
 * application via a signed deep link (the deal id alone is guessable, so the
 * signature is what gates access). The webapp also requires the HubSpot
 * temporary password before exchanging this token for a session.
 *
 * Pass `ttlDays = null` to mint a non-expiring link — used for the application
 * link stored on the HubSpot deal, which the sales team sends manually and which
 * (per product decision) must never expire.
 */
const encodeWarmLeadToken = async (dealId: number, ttlDays: number | null = 30): Promise<string> => {
	const payload: WarmLeadTokenPayload = {
		deal_id: dealId,
		purpose: 'warm_lead',
		...(ttlDays != null ? { exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * ttlDays } : {}),
	};
	return await sign(payload, env.SECRET_KEY);
};

/** Verifies a warm-lead token and returns its deal id, or null if invalid/expired. */
const decodeWarmLeadToken = async (token: string): Promise<number | null> => {
	try {
		const payload = (await verify(token, env.SECRET_KEY)) as WarmLeadTokenPayload;
		if (payload.purpose !== 'warm_lead' || typeof payload.deal_id !== 'number') {
			return null;
		}
		return payload.deal_id;
	} catch {
		return null;
	}
};

type LoginTokenPayload = JWTPayload & {
	uid: number;
	deal_id: number;
	deal_application_id: number;
	purpose: 'login';
	exp: number;
};

/**
 * Signs a magic-link re-login token. Unlike the warm-lead token (which
 * resolves the user from the deal, i.e. the applicant), this carries the exact
 * user being signed in plus their resolved deal context — so it works correctly
 * for both applicants and teammates without ever logging someone in as another.
 */
const encodeLoginToken = async (userId: number, dealId: number, dealApplicationId: number, ttlDays = 14): Promise<string> => {
	const payload: LoginTokenPayload = {
		uid: userId,
		deal_id: dealId,
		deal_application_id: dealApplicationId,
		purpose: 'login',
		exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * ttlDays,
	};
	return await sign(payload, env.SECRET_KEY);
};

/** Verifies a login token and returns its identity + deal context, or null. */
const decodeLoginToken = async (token: string): Promise<{ userId: number; dealId: number; dealApplicationId: number } | null> => {
	try {
		const payload = (await verify(token, env.SECRET_KEY)) as LoginTokenPayload;
		if (
			payload.purpose !== 'login' ||
			typeof payload.uid !== 'number' ||
			typeof payload.deal_id !== 'number' ||
			typeof payload.deal_application_id !== 'number'
		) {
			return null;
		}
		return { userId: payload.uid, dealId: payload.deal_id, dealApplicationId: payload.deal_application_id };
	} catch {
		return null;
	}
};

export {
	decodeInviteToken,
	decodeLoginToken,
	decodeWarmLeadToken,
	encode,
	encodeAuth,
	encodeInviteToken,
	encodeLoginToken,
	encodeWarmLeadToken,
	type JWTPayload,
	type WarmLeadJWTPayload,
};
