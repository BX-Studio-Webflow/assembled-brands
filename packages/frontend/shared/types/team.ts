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
  invitee_name: string;
  user_defined_role: string;
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

export type CreateTeamBody = {
  name: string;
};

export type TeamQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export type CreateTeamResponse = {
  message: string;
  team: {
    id: number;
    name: string;
    host_id: number;
    created_at: string;
    updated_at: string;
  };
};

export type GetTeamInvitationsResponse = TeamInvitation[];

export type GetMyInvitationsResponse = MyInvitation[];

export type GetMyTeamMembersResponse = TeamMembers;

export type GetMyTeamsResponse = MyTeam[];

export type AcceptInvitationResponse = {
  message: string;
  invitation: {
    id: number;
    team_id: number;
    inviter_id: number;
    invitee_email: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
};

export type RejectInvitationResponse = {
  message: string;
  invitation: {
    id: number;
    team_id: number;
    inviter_id: number;
    invitee_email: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
};

export type GetInvitationResponse = {
  id: number;
  team_id: number;
  inviter_id: number;
  invitee_email: string;
  message: string;
  invitee_name: string;
  user_defined_role: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string | number;
  updated_at: string | number;
  team: {
    id: number;
    name: string;
  } | null;
  inviter: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
};
