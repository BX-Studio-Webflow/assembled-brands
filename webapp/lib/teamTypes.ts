// Types for the team-invitation backend (POST /team/invite, GET /team/invitations,
// GET /team/my-teams). Mirrors the existing Hono/Drizzle schema.

export type InvitationStatus = "pending" | "accepted" | "rejected";

// Row shape returned by GET /team/invitations (repo.getInvitationsByTeam).
export type TeamInvitation = {
  id: number;
  team_id: number;
  invitee_email: string;
  invitee_name: string;
  user_defined_role: string;
  message: string | null;
  status: InvitationStatus | null;
  created_at: number | string | null;
  updated_at: number | string | null;
};

// Entry shape returned by GET /team/my-teams.
export type MyTeam = {
  team_id: number;
  team_name: string;
  role: string;
};

// Payload accepted by POST /team/invite.
export type InviteMemberBody = {
  invitee_email: string;
  invitee_name: string;
  team_id: number;
  user_defined_role: string;
  message?: string;
};

export type InviteMemberResponse = {
  message: string;
  invitation: TeamInvitation;
};

// A single member entered in the invite form (before team_id is attached).
export type InviteMemberInput = {
  name: string;
  email: string;
  role: string;
  message?: string;
};
