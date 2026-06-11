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

export { encode, encodeAuth, type JWTPayload, type WarmLeadJWTPayload };
