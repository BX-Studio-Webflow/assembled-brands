import { API_BASE_URL, API_VERSION } from "./config";
import type {
  OnboardingFormValues,
  OnboardingProgressResponse,
  WarmLeadSessionResponse,
} from "./types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

type ApiOptions = {
  method?: string;
  token?: string | null;
  teamId?: string | null;
  body?: unknown;
};

function parse(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Low-level fetch against the existing backend. Used SERVER-SIDE only (SSR and
 * route handlers) so the browser never makes a cross-origin call — no backend
 * CORS changes required. Edge-safe: uses fetch, never axios.
 */
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", token, teamId, body } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (teamId) headers["X-Team-Id"] = teamId;

  const res = await fetch(`${API_BASE_URL}${API_VERSION}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data = parse(await res.text());

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      if (typeof record.message === "string") message = record.message;
      else if (typeof record.error === "string") message = record.error;
    }
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export const exchangeWarmLeadSession = (dealId: number) =>
  apiFetch<WarmLeadSessionResponse>("/onboarding-wizard/warm-lead/session", {
    method: "POST",
    body: { deal_id: dealId },
  });

export type InviteAcceptResponse = {
  token: string;
  team_id?: number | null;
  deal_application_id?: number | null;
};

// Teammate magic-link exchange: trades a signed invite token for a session
// scoped to the inviter's active deal (no deal_id or password required).
export const acceptInviteSession = (token: string) =>
  apiFetch<InviteAcceptResponse>("/onboarding-wizard/invite/accept-session", {
    method: "POST",
    body: { token },
  });

export const getOnboardingProgress = (token: string) =>
  apiFetch<OnboardingProgressResponse>("/onboarding-wizard/progress", { token });

function buildPayload(values: OnboardingFormValues) {
  const working = values.workingWithTeamMember === true;
  return {
    legal_name: values.legalName.trim(),
    incorporation_state: values.incorporationState,
    net_revenue_last_12_months: values.netRevenue,
    working_with_team_member: working,
    ...(working ? { team_member_email: values.teamMemberEmail } : {}),
  };
}

// Returning user with an active session.
export const saveWarmLeadReturning = (values: OnboardingFormValues, token: string) =>
  apiFetch<unknown>("/onboarding-wizard/warm-lead/me", {
    method: "POST",
    token,
    body: buildPayload(values),
  });

// First-time invite: creates the session and returns a token + teams.
export const createWarmLead = (values: OnboardingFormValues, dealId: number) =>
  apiFetch<WarmLeadSessionResponse>("/onboarding-wizard/warm-lead", {
    method: "POST",
    body: { deal_id: dealId, ...buildPayload(values) },
  });
