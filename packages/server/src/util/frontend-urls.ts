import { env } from 'cloudflare:workers';

/** Full URL sent to warm-lead prospects to start their application for a HubSpot deal. */
export function buildWarmLeadApplicationLink(hubspotDealObjectId: number): string {
	const devPrefix = env.NODE_ENV === 'development' ? '/dev' : '';
	return `${env.FRONTEND_URL}${devPrefix}/warm/onboarding-warm-lead?deal_id=${hubspotDealObjectId}`;
}
