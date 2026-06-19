import { apiFetch } from "./api";
import type {
  InviteMemberBody,
  InviteMemberResponse,
  MyTeam,
  TeamInvitation,
} from "./teamTypes";

// All helpers are SERVER-SIDE (SSR + route handlers). The browser never calls
// the backend directly, so no CORS change is needed on the existing API.

// Pending/sent invitations for the team the user hosts.
export const getTeamInvitations = (token: string) =>
  apiFetch<TeamInvitation[]>("/team/invitations", { token });

// Every team the user belongs to (used to resolve the host team_id for invites).
export const getMyTeams = (token: string) =>
  apiFetch<MyTeam[]>("/team/my-teams", { token });

export const inviteMember = (body: InviteMemberBody, token: string) =>
  apiFetch<InviteMemberResponse>("/team/invite", { method: "POST", token, body });

// Resolves the team the user can invite into: their host team, else the first
// team they belong to. Returns null if they belong to no team.
export async function resolveHostTeamId(token: string): Promise<number | null> {
  const teams = await getMyTeams(token);
  if (!Array.isArray(teams) || teams.length === 0) return null;
  const host = teams.find((t) => t.role === "host");
  return (host ?? teams[0]).team_id ?? null;
}
