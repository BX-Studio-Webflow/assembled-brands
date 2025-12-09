export interface Business {
  id: number;
  name: string;
  address: string;
  phone: string;
  dial_code: string | null;
  email: string;
  description: string | null;
  logo_asset_id: number;
  user_id: number;
  updated_at: string;
  created_at: string;
  logo: string;
}

export interface TeamMember {
  name: string;
  email: string;
  phone: string;
  role: string;
  memberId: number;
}

export interface TeamInvitation {
  id: number;
  team_id: number;
  inviter_id: number;
  invitee_email: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MyInvitation {
  id: number;
  team_id: number;
  team_name: string;
  inviter_name: string;
  inviter_email: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MyTeam {
  team_id: number;
  team_name: string;
  role: string;
  created_at: string;
  updated_at: string;
  business: Business;
}

export interface TeamMembers {
  team_id: number;
  team_name: string;
  members: TeamMember[];
}

export interface GetTeamsResponse {
  my_teams: MyTeam[];
  team_members: TeamMembers;
  my_invitations: MyInvitation[];
  team_invitations: TeamInvitation[];
}
