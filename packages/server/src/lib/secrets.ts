import { z } from 'zod';

export const envSchema = z.object({
	PORT: z.string().default('3500'),
	LOG_LEVEL: z.string().default('info'),
	NODE_ENV: z.enum(['development', 'production']).default('development'),
	SECRET_KEY: z.string(),
	DB_HOST: z.string().default('localhost'),
	DB_USER: z.string().optional(), // Workers don’t support DB_HOST/DB_USER unless you use external DB
	DB_PASSWORD: z.string().optional(),
	DB_NAME: z.string().optional(),
	REDIS_HOST: z.string().default('localhost'),
	REDIS_PORT: z.string().default('6379'),
	BREVO_API_KEY: z.string(),
	AWS_REGION: z.string(),
	AWS_ACCESS_KEY: z.string(),
	AWS_SECRET_KEY: z.string(),
	S3_BUCKET_NAME: z.string(),
	TURNSTILE_SECRET_KEY: z.string().optional(),
	FRONTEND_URL: z.string(),
	BRAND_NAME: z.string().default('Elevnt.io'),
	WEBSOCKET_PORT: z.string().default('8081'),
});

export function loadEnvironmentVariables(CloudflareEnv: Cloudflare.Env) {
	//if vars ar eunset, this will throw an error
	return envSchema.parse(CloudflareEnv);
}
