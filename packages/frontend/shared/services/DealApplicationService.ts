import type { DealApplicationsResponse } from '../types/deal-application';
import ApiService from './ApiService';

export async function apiGetMyDealApplications() {
  return ApiService.fetchDataWithAxios<DealApplicationsResponse>({
    url: '/deal-applications',
    method: 'get',
  });
}

export async function apiExchangeWarmLeadSession(dealId: number) {
  return ApiService.fetchDataWithAxios<{
    token: string;
    user: Record<string, unknown>;
    teams: { team_id: number }[];
  }>({
    url: '/onboarding-wizard/warm-lead/session',
    method: 'post',
    data: { deal_id: dealId },
  });
}
