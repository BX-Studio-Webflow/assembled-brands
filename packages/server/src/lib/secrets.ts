import { z } from 'zod';

export const envSchema = z.object({
	// Core application settings
	LOG_LEVEL: z.string().default('info'),
	NODE_ENV: z.enum(['development', 'production']).default('development'),
	SECRET_KEY: z.string(),
	FRONTEND_URL: z.string(),
	BRAND_NAME: z.string().default('Assembled Brands'),

	// Email service
	SENDGRID_API_KEY: z.string(),
	TRANSACTIONAL_EMAIL_TEMPLATE_ID: z.string(),

	// R2/S3 storage
	AWS_REGION: z.string(),
	R2_ACCOUNT_ID: z.string(),
	R2_SECRET_ACCESS_KEY_ID: z.string(),
	R2_SECRET_ACCESS_KEY: z.string(),
	R2_BUCKET_NAME: z.string(),

	// Google Drive integration
	GOOGLE_CLIENT_EMAIL: z.string(),
	GOOGLE_PRIVATE_KEY: z.string(),
	GOOGLE_DRIVE_FOLDER_ID: z.string(),

	// Optional/legacy variables (for backward compatibility)
	PORT: z.string().default('3500').optional(),
	DB_HOST: z.string().default('localhost').optional(),
	DB_USER: z.string().optional(),
	DB_PASSWORD: z.string().optional(),
	DB_NAME: z.string().optional(),
	REDIS_HOST: z.string().default('localhost').optional(),
	REDIS_PORT: z.string().default('6379').optional(),
	AWS_ACCESS_KEY: z.string().optional(),
	AWS_SECRET_KEY: z.string().optional(),
	TURNSTILE_SECRET_KEY: z.string().optional(),
	WEBSOCKET_PORT: z.string().default('8081').optional(),
});

export function loadEnvironmentVariables(CloudflareEnv: Cloudflare.Env) {
	//if vars ar eunset, this will throw an error
	return envSchema.parse(CloudflareEnv);
}
