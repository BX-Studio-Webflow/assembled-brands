import { and, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import { schema, teamInvitationSchema, teamMemberSchema, teamSchema } from '../schema/schema.ts';
import { type TeamQuery } from '../web/validator/team.ts';

/**
 * Repository for team and team member operations
 */
export class TeamRepository {
	/**
	 * Drizzle D1 database instance
	 */
	private db: DrizzleD1Database<typeof schema>;

	/**
	 * Construct the TeamRepository
	 * @param {DrizzleD1Database<typeof schema>} db - Database instance
	 */
	constructor(db: DrizzleD1Database<typeof schema>) {
		this.db = db;
	}

	/**
	 * Create a new team and add the given host as a member with role 'host'
	 * @param {string} name - Team name
	 * @param {number} hostId - Host user ID
	 * @returns {Promise<Team>} Created team record
	 */
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
		await this.db
			.insert(teamMemberSchema)
			.values({
				team_id: team.id,
				user_id: hostId,
				role: 'host',
				created_at: new Date(),
				updated_at: new Date(),
			})
			.returning();

		return team;
	}

	/**
	 * Get a team by ID including its members
	 * @param {number} id - Team ID
	 * @returns {Promise<Team|undefined>} The team if found
	 */
	public async getTeamById(id: number) {
		return await this.db.query.teamSchema.findFirst({
			where: (team, { eq }) => eq(team.id, id),
			with: {
				members: true,
			},
		});
	}

	/**
	 * List team members with simple pagination and optional client-side search
	 * @param {number} teamId - Team ID
	 * @param {TeamQuery} [query] - Pagination and search options
	 * @returns {Promise<{members: any[], total: number}>} Members and total count
	 */
	public async getTeamMembers(teamId: number, query?: TeamQuery) {
		const { page = 1, limit = 10, search } = query || {};
		const offset = (page - 1) * limit;

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
						first_name: true,
						last_name: true,
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
					member.user?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
					member.user?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
					member.team?.name?.toLowerCase().includes(search.toLowerCase()),
			);
		}

		return { members, total: totalMembers.length };
	}

	/**
	 * Get all teams a user is a member of
	 * @param {number} userId - User ID
	 * @returns {Promise<TeamMember[]>} List of team membership records
	 */
	public async getUserTeams(userId: number) {
		return await this.db.query.teamMemberSchema.findMany({
			where: (member, { eq }) => eq(member.user_id, userId),
		});
	}

	/**
	 * Check whether a user is the host of a team
	 * @param {number} teamId - Team ID
	 * @param {number} userId - User ID
	 * @returns {Promise<boolean>} True if the user is host
	 */
	public async isTeamHost(teamId: number, userId: number) {
		const member = await this.db.query.teamMemberSchema.findFirst({
			where: (member, { and, eq }) => and(eq(member.team_id, teamId), eq(member.user_id, userId), eq(member.role, 'host')),
		});
		return !!member;
	}

	/**
	 * Check whether a user is a member of a team
	 * @param {number} teamId - Team ID
	 * @param {number} userId - User ID
	 * @returns {Promise<boolean>} True if the user is a member
	 */
	public async isTeamMember(teamId: number, userId: number) {
		const member = await this.db.query.teamMemberSchema.findFirst({
			where: (member, { and, eq }) => and(eq(member.team_id, teamId), eq(member.user_id, userId)),
		});
		return !!member;
	}

	/**
	 * Add a user to a team with a specific role
	 * @param {number} teamId - Team ID
	 * @param {number} userId - User ID
	 * @param {'host'|'member'} [role='member'] - Role for the user
	 * @returns {Promise<number>} Inserted team member ID
	 */
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

	/**
	 * Create a team invitation record
	 * @param {number} teamId - Team ID
	 * @param {number} inviterId - Inviter user ID
	 * @param {string} inviteeEmail - Invitee email
	 * @param {string} inviteeName - Invitee name
	 * @param {string} userDefinedRole - Role suggested by inviter
	 * @param {string} message - Optional message
	 * @returns {Promise<number>} Created invitation ID
	 */
	public async createInvitation(
		teamId: number,
		inviterId: number,
		inviteeEmail: string,
		inviteeName: string,
		userDefinedRole: string,
		message: string,
	) {
		const invitations = await this.db
			.insert(teamInvitationSchema)
			.values({
				team_id: teamId,
				inviter_id: inviterId,
				invitee_email: inviteeEmail,
				invitee_name: inviteeName,
				user_defined_role: userDefinedRole,
				message: message,
				status: 'pending',
				created_at: new Date(),
				updated_at: new Date(),
			})
			.returning();

		return invitations[0].id;
	}

	/**
	 * Get a single invitation by ID with associated team and inviter
	 * @param {number} id - Invitation ID
	 * @returns {Promise<TeamInvitation|undefined>} Invitation if found
	 */
	public async getInvitation(id: number) {
		return await this.db.query.teamInvitationSchema.findFirst({
			where: (invitation, { eq }) => eq(invitation.id, id),
			with: {
				team: {
					columns: {
						id: true,
						name: true,
					},
				},
				inviter: {
					columns: {
						id: true,
						first_name: true,
						last_name: true,
						email: true,
					},
				},
			},
		});
	}

	/**
	 * Get invitations for a team ordered by creation date descending
	 * @param {number} teamId - Team ID
	 * @returns {Promise<TeamInvitation[]>} List of invitations
	 */
	public async getInvitationsByTeam(teamId: number) {
		return await this.db.query.teamInvitationSchema.findMany({
			where: (invitation, { eq }) => eq(invitation.team_id, teamId),
			orderBy: (invitation, { desc }) => desc(invitation.created_at),
		});
	}

	/**
	 * Get invitations by invitee email, optionally filtering by status
	 * @param {string} email - Invitee email
	 * @param {'pending'|'accepted'|'rejected'} [status] - Optional status filter
	 * @returns {Promise<TeamInvitation[]>} List of invitations
	 */
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
						first_name: true,
						last_name: true,
						email: true,
					},
				},
			},
		});
	}

	/**
	 * Update the status of an invitation
	 * @param {number} id - Invitation ID
	 * @param {'pending'|'accepted'|'rejected'} status - New status
	 * @returns {Promise<void>}
	 */
	public async updateInvitationStatus(id: number, status: 'pending' | 'accepted' | 'rejected') {
		await this.db.update(teamInvitationSchema).set({ status, updated_at: new Date() }).where(eq(teamInvitationSchema.id, id));
	}

	/**
	 * Get teams that a user belongs to, including team info
	 * @param {number} userId - User ID
	 * @returns {Promise<TeamMember[]>} Membership records with team info
	 */
	public async getTeamByUserId(userId: number) {
		return await this.db.query.teamMemberSchema.findMany({
			where: eq(teamMemberSchema.user_id, userId),
			with: {
				team: true,
			},
		});
	}

	/**
	 * Get the team where the user is a host
	 * @param {number} userId - User ID
	 * @returns {Promise<TeamMember|undefined>} Team membership where role is host
	 */
	public async getTeamByHostId(userId: number) {
		return await this.db.query.teamMemberSchema.findFirst({
			where: and(eq(teamMemberSchema.user_id, userId), eq(teamMemberSchema.role, 'host')),
			with: {
				team: true,
				user: true,
			},
		});
	}

	/**
	 * Remove a member from a team (hosts cannot be removed with this method)
	 * @param {number} teamId - Team ID
	 * @param {number} userId - User ID
	 * @returns {Promise<void>}
	 */
	public async removeTeamMember(teamId: number, userId: number) {
		await this.db.delete(teamMemberSchema).where(
			and(
				eq(teamMemberSchema.team_id, teamId),
				eq(teamMemberSchema.user_id, userId),
				eq(teamMemberSchema.role, 'member'), // Only allow removing members, not hosts
			),
		);
	}

	/**
	 * Delete a team invitation by ID
	 * @param {number} id - Invitation ID
	 * @returns {Promise<void>}
	 */
	public async deleteInvitation(id: number) {
		await this.db.delete(teamInvitationSchema).where(eq(teamInvitationSchema.id, id));
	}
}
