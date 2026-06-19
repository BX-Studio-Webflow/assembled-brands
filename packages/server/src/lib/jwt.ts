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

export { encode, encodeAuth, encodeInviteToken, decodeInviteToken, type JWTPayload, type WarmLeadJWTPayload };
