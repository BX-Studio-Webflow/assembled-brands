import { and, eq, like } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import {
  teamInvitationSchema,
  teamMemberSchema,
  teamSchema,
  userSchema,
  schema,
} from '../schema/schema.ts';
import { TeamQuery } from '../web/validator/team.ts';

export class TeamRepository {
  private db: DrizzleD1Database<typeof schema>;

  constructor(db: DrizzleD1Database<typeof schema>) {
    this.db = db;
  }

  public async createTeam(name: string, hostId: number) {
    const [team] = await this.db
      .insert(teamSchema)
      .values({
        name,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    // Add host as team member
    await this.db.insert(teamMemberSchema).values({
      team_id: team.id,
      user_id: hostId,
      role: 'host',
      created_at: new Date(),
      updated_at: new Date(),
    }).returning();

    return team;
  }

  public async getTeamById(id: number) {
    return await this.db.query.teamSchema.findFirst({
      where: (team, { eq }) => eq(team.id, id),
      with: {
        members: true,
      },
    });
  }

  public async getTeamMembers(teamId: number, query?: TeamQuery) {
    const { page = 1, limit = 10, search } = query || {};
    const offset = (page - 1) * limit;

    const whereConditions = [eq(teamMemberSchema.team_id, teamId)];

    // Use relational query API which handles joins automatically
    const allMembers = await this.db.query.teamMemberSchema.findMany({
      where: (member, { eq, and }) => {
        const conditions = [eq(member.team_id, teamId)];
        // Note: search on team name would require a different approach with relations
        return and(...conditions);
      },
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        team: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      limit: limit,
      offset: offset,
    });

    // Get total count
    const totalMembers = await this.db.query.teamMemberSchema.findMany({
      where: (member, { eq }) => eq(member.team_id, teamId),
    });

    // Filter by search if provided (client-side filtering for now)
    let members = allMembers;
    if (search) {
      members = allMembers.filter(
        (member) =>
          member.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
          member.team?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return { members, total: totalMembers.length };
  }

  public async getUserTeams(userId: number) {
    return await this.db.query.teamMemberSchema.findMany({
      where: (member, { eq }) => eq(member.user_id, userId),
    });
  }

  public async isTeamHost(teamId: number, userId: number) {
    const member = await this.db.query.teamMemberSchema.findFirst({
      where: (member, { and, eq }) =>
        and(eq(member.team_id, teamId), eq(member.user_id, userId), eq(member.role, 'host')),
    });
    return !!member;
  }

  public async isTeamMember(teamId: number, userId: number) {
    const member = await this.db.query.teamMemberSchema.findFirst({
      where: (member, { and, eq }) => and(eq(member.team_id, teamId), eq(member.user_id, userId)),
    });
    return !!member;
  }

  public async addTeamMember(teamId: number, userId: number, role: 'host' | 'member' = 'member') {
    const members = await this.db
      .insert(teamMemberSchema)
      .values({
        team_id: teamId,
        user_id: userId,
        role,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return members[0].id;
  }

  public async createInvitation(teamId: number, inviterId: number, inviteeEmail: string) {
    const invitations = await this.db
      .insert(teamInvitationSchema)
      .values({
        team_id: teamId,
        inviter_id: inviterId,
        invitee_email: inviteeEmail,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return invitations[0].id;
  }

  public async getInvitation(id: number) {
    return await this.db.query.teamInvitationSchema.findFirst({
      where: (invitation, { eq }) => eq(invitation.id, id),
    });
  }

  public async getInvitationsByTeam(teamId: number) {
    return await this.db.query.teamInvitationSchema.findMany({
      where: (invitation, { eq }) => eq(invitation.team_id, teamId),
      orderBy: (invitation, { desc }) => desc(invitation.created_at),
    });
  }

  public async getInvitationsByEmail(email: string, status?: 'pending' | 'accepted' | 'rejected') {
    return await this.db.query.teamInvitationSchema.findMany({
      where: (invitation, { eq, and }) => {
        const conditions = [eq(invitation.invitee_email, email)];
        if (status) {
          conditions.push(eq(invitation.status, status));
        }
        return and(...conditions);
      },
      orderBy: (invitation, { desc }) => desc(invitation.created_at),
      with: {
        team: true,
        inviter: {
          columns: {
            name: true,
            email: true,
          },
        },
      },
    });
  }

  public async updateInvitationStatus(id: number, status: 'pending' | 'accepted' | 'rejected') {
    await this.db
      .update(teamInvitationSchema)
      .set({ status, updated_at: new Date() })
      .where(eq(teamInvitationSchema.id, id));
  }

  public async getTeamByUserId(userId: number) {
    return await this.db.query.teamMemberSchema.findMany({
      where: eq(teamMemberSchema.user_id, userId),
      with: {
        team: true,
      },
    });
  }

  public async getTeamByHostId(userId: number) {
    return await this.db.query.teamMemberSchema.findFirst({
      where: and(eq(teamMemberSchema.user_id, userId), eq(teamMemberSchema.role, 'host')),
      with: {
        team: true,
        user: true,
      },
    });
  }

  public async removeTeamMember(teamId: number, userId: number) {
    await this.db.delete(teamMemberSchema).where(
      and(
        eq(teamMemberSchema.team_id, teamId),
        eq(teamMemberSchema.user_id, userId),
        eq(teamMemberSchema.role, 'member'), // Only allow removing members, not hosts
      ),
    );
  }

  public async deleteInvitation(id: number) {
    await this.db.delete(teamInvitationSchema).where(eq(teamInvitationSchema.id, id));
  }
}
