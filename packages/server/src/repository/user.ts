import { and, desc, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import { type NewUser, type User, userSchema } from '../schema/schema.js';
import { teamInvitationSchema, teamMemberSchema } from '../schema/schema.js';

export class UserRepository {
  private db: DrizzleD1Database;

  constructor(db: DrizzleD1Database) {
    this.db = db;
  }

  public async create(user: NewUser) {
    return this.db.insert(userSchema).values(user).returning();
  }

  public async find(id: number) {
    return this.db.query.userSchema.findFirst({
      where: eq(userSchema.id, id),
      with: {
        business: true,
      },
    });
  }

  public async findByEmail(email: string) {
    const user = await this.db.query.userSchema.findFirst({
      where: eq(userSchema.email, email),
      with: {
        business: true,
      },
    });
    if (user && !user.auth_provider) {
      user.auth_provider = 'local';
    }
    return user;
  }

  public async update(id: number, user: Partial<User>) {
    return this.db.update(userSchema).set(user).where(eq(userSchema.id, id));
  }

  public async delete(id: number) {
    return this.db.delete(userSchema).where(eq(userSchema.id, id));
  }

  public async getDashboard(id: number) {
    // Get user profile with business info
    const user = await this.db.query.userSchema.findFirst({
      where: eq(userSchema.id, id),
      with: {
        business: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get all metrics in a single query using subqueries (only from currently supported tables)
    const [metrics, eventsStats] = await Promise.all([
      this.db
        .select({
          // Content counts (events & courses only)
          total_events: sql<number>`(SELECT COUNT(*) FROM ${eventSchema} WHERE ${eventSchema.host_id} = ${id})`,
          total_courses: sql<number>`(SELECT COUNT(*) FROM ${courseSchema} WHERE ${courseSchema.host_id} = ${id})`,
          total_contacts: sql<number>`(SELECT COUNT(*) FROM ${contactSchema} WHERE ${contactSchema.id} = ${id})`,

          // Engagement metrics (callbacks & team)
          pending_callbacks: sql<number>`(SELECT COUNT(*) FROM ${callbackSchema} WHERE ${callbackSchema.host_id} = ${id} AND ${callbackSchema.status} = 'uncalled')`,
          team_members: sql<number>`(SELECT COUNT(*) FROM ${teamMemberSchema} WHERE ${teamMemberSchema.team_id} = ${id})`,
          pending_invitations: sql<number>`(SELECT COUNT(*) FROM ${teamInvitationSchema} WHERE ${teamInvitationSchema.team_id} = ${id} AND ${teamInvitationSchema.status} = 'pending')`,

          // Content status breakdown (events & courses only)
          events_draft: sql<number>`(SELECT COUNT(*) FROM ${eventSchema} WHERE ${eventSchema.host_id} = ${id} AND ${eventSchema.status} = 'draft')`,
          events_published: sql<number>`(SELECT COUNT(*) FROM ${eventSchema} WHERE ${eventSchema.host_id} = ${id} AND ${eventSchema.status} = 'published')`,
          events_suspended: sql<number>`(SELECT COUNT(*) FROM ${eventSchema} WHERE ${eventSchema.host_id} = ${id} AND ${eventSchema.status} = 'suspended')`,
          events_cancelled: sql<number>`(SELECT COUNT(*) FROM ${eventSchema} WHERE ${eventSchema.host_id} = ${id} AND ${eventSchema.status} = 'cancelled')`,

          courses_draft: sql<number>`(SELECT COUNT(*) FROM ${courseSchema} WHERE ${courseSchema.host_id} = ${id} AND ${courseSchema.status} = 'draft')`,
          courses_published: sql<number>`(SELECT COUNT(*) FROM ${courseSchema} WHERE ${courseSchema.host_id} = ${id} AND ${courseSchema.status} = 'published')`,
          courses_archived: sql<number>`(SELECT COUNT(*) FROM ${courseSchema} WHERE ${courseSchema.host_id} = ${id} AND ${courseSchema.status} = 'archived')`,
        })
        .from(userSchema)
        .where(eq(userSchema.id, id)),
      this.getAllEventsStats(id),
    ]);

    return {
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_picture: user.profile_picture,
        is_verified: user.is_verified,
        is_banned: user.is_banned,
        is_deleted: user.is_deleted,
        business: user.business,
        stripe_connect_status: user.stripe_connect_status,
        subscription_status: user.subscription_status,
        trial_ends_at: user.trial_ends_at,
      },
      content: {
        total_events: metrics.total_events,
        total_podcasts: 0,
        total_courses: metrics.total_courses,
        total_leads: 0,
        total_contacts: metrics.total_contacts,
      },
      revenue: {
        total_revenue: 0,
        revenue_last_30_days: 0,
        active_memberships: 0,
        successful_payments: 0,
        failed_payments: 0,
        recent_successful_payments: [],
        recent_failed_payments: [],
      },
      engagement: {
        active_bookings: 0,
        new_bookings_last_30_days: 0,
        pending_callbacks: metrics.pending_callbacks,
        team_members: metrics.team_members,
        pending_invitations: metrics.pending_invitations,
        new_leads_last_30_days: 0,
        new_contacts_last_30_days: 0,
      },
      content_status: {
        events: {
          draft: metrics.events_draft,
          published: metrics.events_published,
          suspended: metrics.events_suspended,
          cancelled: metrics.events_cancelled,
        },
        courses: {
          draft: metrics.courses_draft,
          published: metrics.courses_published,
          archived: metrics.courses_archived,
        },
      },
      events_stats: eventsStats,
    };
  }

  public async getAllEventsStats(id: number) {
    // Get all pre-recorded events for the user with their statistics
    const events = await this.db
      .select({
        event_id: eventSchema.id,
        event_name: eventSchema.event_name,
        event_type: eventSchema.event_type,
        status: eventSchema.status,
        created_at: eventSchema.created_at,
      })
      .from(eventSchema)
      .where(and(eq(eventSchema.host_id, id)));

    const eventsStats = events.map((event) => ({
      event_id: event.event_id,
      event_name: event.event_name,
      event_type: event.event_type,
      status: event.status,
      created_at: event.created_at,
      registrations: 0,
      attendees: 0,
      non_attendees: 0,
      fallthrough_rate: 0,
      earnings: 0,
    }));

    return {
      events: eventsStats,
      totals: {
        total_registrations: 0,
        total_attendees: 0,
        total_non_attendees: 0,
        total_earnings: 0,
        overall_fallthrough_rate: 0,
      },
    };
  }
}
