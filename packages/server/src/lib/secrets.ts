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
	SENDGRID_FROM_EMAIL: z.string().optional(),
	SENDGRID_FROM_NAME: z.string().optional(),

	// Slack notifications (optional — underwriting alerts skip when unset)
	SLACK_BOT_TOKEN: z.string().optional(),
	SLACK_CHANNEL_ID: z.string().optional(),

	// Feature flag: when not 'true', internal underwriting alert emails are not sent
	UNDERWRITING_ALERT_EMAILS_ENABLED: z.string().default('false'),

	// Feature flag: when 'false', Slack notifications are not sent (enabled by default)
	SLACK_NOTIFICATIONS_ENABLED: z.string().default('true'),

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

	// Web app (magic-link / invite emails build URLs from this). Optional in the
	// schema so local `wrangler dev` boots without it, but enforced in production
	// by requireProductionVars() below.
	WEBAPP_URL: z.string().optional(),

	// HubSpot CRM (deal ingestion + stage sync). Optional locally; required in prod.
	HUBSPOT_API_KEY: z.string().optional(),
	HUBSPOT_PORTAL_ID: z.string().optional(),

	// Slack notifications (scope-disputed; fully optional + flag-gated).
	SLACK_BOT_TOKEN: z.string().optional(),
	SLACK_CHANNEL_ID: z.string().optional(),
	SLACK_NOTIFICATIONS_ENABLED: z.string().optional(),
	SLACK_NOTIFICATION_WEBHOOK_URL: z.string().optional(),

	// Underwriting submission alerts (optional; skipped when empty/disabled).
	UNDERWRITING_ALERT_EMAILS: z.string().optional(),
	UNDERWRITING_ALERT_EMAILS_ENABLED: z.string().optional(),

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

// Vars that are tolerated as placeholders/empty locally but MUST be real in
// production. Keeping this separate lets `wrangler dev` boot with placeholders
// while a misconfigured production worker fails fast at startup instead of
// silently emailing broken links or skipping HubSpot ingestion.
const PRODUCTION_REQUIRED_VARS = [
	'SECRET_KEY',
	'FRONTEND_URL',
	'WEBAPP_URL',
	'SENDGRID_API_KEY',
	'TRANSACTIONAL_EMAIL_TEMPLATE_ID',
	'HUBSPOT_API_KEY',
	'R2_ACCOUNT_ID',
	'R2_SECRET_ACCESS_KEY_ID',
	'R2_SECRET_ACCESS_KEY',
	'R2_BUCKET_NAME',
	'GOOGLE_CLIENT_EMAIL',
	'GOOGLE_PRIVATE_KEY',
	'GOOGLE_DRIVE_FOLDER_ID',
] as const;

// Values that obviously aren't real (so prod doesn't boot with leftover dev
// placeholders or the dev signing key).
const PLACEHOLDER_PATTERNS = [/placeholder/i, /change-me/i, /^local-dev-/i, /^$/];

function requireProductionVars(parsed: z.infer<typeof envSchema>): void {
	if (parsed.NODE_ENV !== 'production') {
		return;
	}
	const problems: string[] = [];
	for (const key of PRODUCTION_REQUIRED_VARS) {
		const value = (parsed as Record<string, unknown>)[key];
		if (typeof value !== 'string' || PLACEHOLDER_PATTERNS.some((re) => re.test(value))) {
			problems.push(key);
		}
	}
	if (problems.length > 0) {
		throw new Error(
			`Production environment is misconfigured. The following variables are missing or still ` +
				`placeholders: ${problems.join(', ')}. Refusing to start.`,
		);
	}
}

export function loadEnvironmentVariables(CloudflareEnv: Cloudflare.Env) {
	// Throws if any base-required var is unset.
	const parsed = envSchema.parse(CloudflareEnv);
	// Additionally enforce prod-critical vars are real (not dev placeholders).
	requireProductionVars(parsed);
	return parsed;
}
