import { env } from 'cloudflare:workers';
import type { Context } from 'hono';

import { sendTemplateEmail } from '../../lib/email-processor.js';
import { verify } from '../../lib/encryption.js';
import { decodeInviteToken, decodeLoginToken, decodeWarmLeadToken, encode, encodeLoginToken } from '../../lib/jwt.js';
import { logger } from '../../lib/logger.js';
import type { User } from '../../schema/schema.js';
import type { FinancialWizardService } from '../../service/financial-wizard.js';
import type { OnboardingWizardService } from '../../service/onboarding-wizard.js';
import type { TeamService } from '../../service/team.js';
import type { UserService } from '../../service/user.js';
import { getDealApplicationIdFromContext } from '../../util/deal-application-context.js';
import type { UpdateStepBody } from '../validator/financial-wizard.js';
import type {
	InviteAcceptSessionBody,
	LoginLinkBody,
	LoginSessionBody,
	OnboardingStep1Body,
	OnboardingStep2Body,
	OnboardingStep3Body,
	PasswordLoginSessionBody,
	WarmLeadDetailsBody,
	WarmLeadDetailsForUserBody,
	WarmLeadPasswordSessionBody,
	WarmLeadSessionBody,
	WarmLeadTokenSessionBody,
} from '../validator/onboarding.ts';
import { ERRORS, serveBadRequest, serveInternalServerError } from './resp/error.js';
import { serveData } from './resp/resp.js';
import { serializeUser } from './serializer/user.js';

export class OnboardingWizardController {
	private service: OnboardingWizardService;
	private userService: UserService;
	private financialWizardService: FinancialWizardService;
	private teamService: TeamService;

	constructor(
		service: OnboardingWizardService,
		userService: UserService,
		financialWizardService: FinancialWizardService,
		teamService: TeamService,
	) {
		this.service = service;
		this.userService = userService;
		this.financialWizardService = financialWizardService;
		this.teamService = teamService;
	}

	/**
	 * Retrieves user information from JWT payload
	 * @param {Context} c - The Hono context
	 * @returns {Promise<User | undefined>} The user if found
	 * @private
	 */
	private async getUser(c: Context) {
		const { email } = c.get('jwtPayload');
		const user = await this.userService.findByEmail(email);
		return user;
	}

	/**
	 * Gets the effective user ID for the request (hostId if team access, otherwise user.id)
	 * @param {Context} c - The Hono context
	 * @param {User} user - The authenticated user
	 * @returns {number} The effective user ID to use for service calls
	 * @private
	 */
	private getEffectiveUserId(c: Context, user: User): number {
		const hostId = c.get('hostId');
		return hostId || user.id;
	}

	/**
	 * Saves Step 1: Company Info
	 * @param {Context} c - The Hono context containing step 1 data
	 * @returns {Promise<Response>} Response containing saved application data
	 * @throws {Error} When saving step 1 fails
	 */
	public saveStep1 = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const body: OnboardingStep1Body = await c.req.json();
			const effectiveUserId = this.getEffectiveUserId(c, user);
			const dealApplicationId = getDealApplicationIdFromContext(c);
			const application = await this.service.saveStep1(effectiveUserId, body, dealApplicationId);

			return serveData(c, {
				message: 'Step 1 saved successfully',
				application,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Saves Step 2: Business Details
	 * @param {Context} c - The Hono context containing step 2 data
	 * @returns {Promise<Response>} Response containing saved application data
	 * @throws {Error} When saving step 2 fails
	 */
	public saveStep2 = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const effectiveUserId = this.getEffectiveUserId(c, user);
			const dealApplicationId = getDealApplicationIdFromContext(c);
			const application = await this.service.getProgress(effectiveUserId, dealApplicationId);
			if (!application) {
				return serveBadRequest(c, "Ops, we can't find your application. Have you started it yet?");
			}

			const body: OnboardingStep2Body = await c.req.json();
			const updatedApplication = await this.service.saveStep2(effectiveUserId, body, dealApplicationId);

			return serveData(c, {
				message: 'Step 2 saved successfully',
				application: updatedApplication,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Saves Step 3: Qualification
	 * @param {Context} c - The Hono context containing step 3 data
	 * @returns {Promise<Response>} Response containing saved application data
	 * @throws {Error} When saving step 3 fails
	 */
	public saveStep3 = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const effectiveUserId = this.getEffectiveUserId(c, user);
			const dealApplicationId = getDealApplicationIdFromContext(c);
			const application = await this.service.getProgress(effectiveUserId, dealApplicationId);
			if (!application) {
				return serveBadRequest(c, "Ops, we can't find your application. Have you started it yet?");
			}

			const body: OnboardingStep3Body = await c.req.json();
			const updatedApplication = await this.service.saveStep3(effectiveUserId, body, dealApplicationId);

			return serveData(c, {
				message: 'Step 3 saved successfully',
				application: updatedApplication,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Gets current progress
	 * @param {Context} c - The Hono context
	 * @returns {Promise<Response>} Response containing progress data
	 * @throws {Error} When progress retrieval fails
	 */
	public getProgress = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}
			const userId = c.req.query('user_id') as string | undefined;

			const effectiveUserId = userId ? Number(userId) : this.getEffectiveUserId(c, user);
			const dealApplicationId = getDealApplicationIdFromContext(c);

			const application = await this.service.getProgress(effectiveUserId, dealApplicationId);
			if (!application) {
				return serveBadRequest(c, "Ops, we can't find your application. Have you started it yet?");
			}

			// Calculate percentage (3 steps total)
			const currentStep = application.current_step || 1;
			const totalSteps = 3;
			const percentage = application.is_complete ? 100 : Math.round((currentStep / totalSteps) * 100);

			const progress = {
				current_step: currentStep,
				is_complete: application.is_complete || false,
				is_qualified: application.is_qualified || false,
				is_rejected: application.is_rejected || false,
				rejection_reason: application.rejection_reason || null,
				percentage,
				progress_data: application,
				step1: {
					legal_name: application.legal_name || null,
					employee_count: application.employee_count || null,
					website: application.website || null,
				},
				step2: {
					years_in_business: application.years_in_business || null,
					asset_type: application.asset_type || null,
					desired_loan_amount: application.desired_loan_amount || null,
				},
				step3: {
					company_type: application.company_type || null,
					company_type_other: application.company_type_other || null,
					revenue_qualification: application.revenue_qualification || null,
				},
			};

			return c.json({
				progress,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Updates the current step
	 * @param {Context} c - The Hono context containing step update data
	 * @returns {Promise<Response>} Response containing updated application data
	 * @throws {Error} When step update fails
	 */
	public updateStep = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const effectiveUserId = this.getEffectiveUserId(c, user);
			const dealApplicationId = getDealApplicationIdFromContext(c);
			const application = await this.service.getProgress(effectiveUserId, dealApplicationId);
			if (!application) {
				return serveBadRequest(c, "Ops, we can't find your application. Have you started it yet?");
			}

			const body: UpdateStepBody = await c.req.json();
			const updatedApplication = await this.service.updateStep(effectiveUserId, body.step, dealApplicationId);

			return serveData(c, {
				message: 'Step updated successfully',
				application: updatedApplication,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Marks application as complete
	 * @param {Context} c - The Hono context
	 * @returns {Promise<Response>} Response containing completed application data
	 * @throws {Error} When completion fails
	 */
	public completeApplication = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const effectiveUserId = this.getEffectiveUserId(c, user);
			const dealApplicationId = getDealApplicationIdFromContext(c);
			const application = await this.service.getProgress(effectiveUserId, dealApplicationId);
			if (!application) {
				return serveBadRequest(c, "Ops, we can't find your application. Have you started it yet?");
			}

			const completedApplication = await this.service.completeApplication(effectiveUserId, dealApplicationId);

			return serveData(c, {
				message: 'Onboarding completed successfully',
				application: completedApplication,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Unauthenticated warm-lead submission.
	 * Saves the company details, then returns a signed JWT + full user payload
	 * so the client can authenticate immediately (same shape as /user/login).
	 */
	public submitWarmLeadDetails = async (c: Context) => {
		try {
			const body: WarmLeadDetailsBody = await c.req.json();
			const { application, user, dealApplicationId } = await this.service.saveWarmLeadDetails(body);

			const [token, serializedUser, financialWizardProgress, onboardingProgress, teams] = await Promise.all([
				encode(user.id, user.email, body.deal_id, dealApplicationId),
				serializeUser(user),
				this.financialWizardService.getProgress(user.id, dealApplicationId),
				this.service.getProgress(user.id, dealApplicationId),
				this.teamService.getUserTeams(user.id),
			]);

			return c.json({
				token,
				user: serializedUser,
				financialWizardProgress,
				onboardingProgress,
				teams,
				application,
			});
		} catch (error) {
			logger.error(error);
			if (error instanceof Error && error.message.includes('No processed deal')) {
				return serveBadRequest(c, 'Deal not found or not yet processed. Please try again shortly.');
			}
			if (error instanceof Error && error.message.includes('no associated user')) {
				return serveBadRequest(c, 'No account linked to this deal yet. Please wait for your invite email.');
			}
			return serveInternalServerError(c, error);
		}
	};

	public submitWarmLeadDetailsForLoggedInUser = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}
			const body: WarmLeadDetailsForUserBody = await c.req.json();
			const dealApplicationId = getDealApplicationIdFromContext(c);
			const { application } = await this.service.saveWarmLeadDetailsForUser(user.id, body, dealApplicationId);
			return serveData(c, {
				message: 'Details saved successfully',
				application,
			});
		} catch (error) {
			logger.error(error);
			if (error instanceof Error && error.message.includes('No processed deal')) {
				return serveBadRequest(c, 'No application is linked to this account yet. Please use your invitation link first.');
			}
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Unauthenticated teammate "Accept Invite" exchange.
	 * Verifies the signed invite token, accepts the invitation (without the
	 * legacy temp-password email), and mints a session scoped to the inviter's
	 * active deal — dropping the teammate straight into that workspace.
	 */
	public acceptInviteSession = async (c: Context) => {
		try {
			const body: InviteAcceptSessionBody = await c.req.json();

			const invitationId = await decodeInviteToken(body.token);
			if (!invitationId) {
				return serveBadRequest(c, 'This invite link is invalid or has expired. Please ask for a new invite.');
			}

			const invitation = await this.teamService.getInvitation(invitationId);
			if (!invitation) {
				return serveBadRequest(c, 'Invitation not found.');
			}

			const invitedTeam = await this.teamService.getTeamById(invitation.team_id);
			const scopedDealApplicationId = invitedTeam?.deal_application_id ?? null;
			const dealContext =
				scopedDealApplicationId != null
					? await this.service.getDealContextByDealApplicationId(scopedDealApplicationId)
					: await this.service.getActiveDealContextForUser(invitation.inviter_id);
			if (!dealContext) {
				return serveBadRequest(c, "We couldn't find an active application for this invite. Please contact your team.");
			}

			// Accept the invitation (create/find user, add to team), suppressing
			// the temp-password email since teammates use the magic link instead.
			if (invitation.status !== 'accepted') {
				await this.teamService.acceptInvitation(invitationId, { sendCredentialsEmail: false });
			}

			const inviteeUser = await this.userService.findByEmail(invitation.invitee_email);
			if (!inviteeUser) {
				return serveBadRequest(c, 'Failed to set up your teammate account.');
			}

			const [token, serializedUser, financialWizardProgress, onboardingProgress, teams] = await Promise.all([
				encode(inviteeUser.id, inviteeUser.email, dealContext.dealId, dealContext.dealApplicationId),
				serializeUser(inviteeUser),
				this.financialWizardService.getProgress(inviteeUser.id, dealContext.dealApplicationId),
				this.service.getProgress(inviteeUser.id, dealContext.dealApplicationId),
				this.teamService.getUserTeams(inviteeUser.id),
			]);

			return c.json({
				token,
				team_id: invitation.team_id,
				deal_application_id: dealContext.dealApplicationId,
				user: serializedUser,
				financialWizardProgress,
				onboardingProgress,
				teams,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Unauthenticated warm-lead session exchange.
	 * Validates deal_id and returns a fresh auth token + user context for that deal.
	 */
	public createWarmLeadSession = async (c: Context) => {
		try {
			const body: WarmLeadSessionBody = await c.req.json();
			const { user, dealApplicationId } = await this.service.getWarmLeadContextByDealId(body.deal_id);

			const [token, serializedUser, financialWizardProgress, onboardingProgress, teams] = await Promise.all([
				encode(user.id, user.email, body.deal_id, dealApplicationId),
				serializeUser(user),
				this.financialWizardService.getProgress(user.id, dealApplicationId),
				this.service.getProgress(user.id, dealApplicationId),
				this.teamService.getUserTeams(user.id),
			]);

			return c.json({
				token,
				user: serializedUser,
				financialWizardProgress,
				onboardingProgress,
				teams,
			});
		} catch (error) {
			logger.error(error);
			if (error instanceof Error && error.message.includes('No processed deal')) {
				return serveBadRequest(c, 'Deal not found or not yet processed. Please try again shortly.');
			}
			if (error instanceof Error && error.message.includes('no associated user')) {
				return serveBadRequest(c, 'No account linked to this deal yet. Please wait for your invite email.');
			}
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Unauthenticated warm-lead signed-link exchange retained for legacy clients.
	 * New webapp entry uses createWarmLeadPasswordSession so the HubSpot temporary
	 * password is required before minting a session.
	 */
	public createWarmLeadTokenSession = async (c: Context) => {
		try {
			const body: WarmLeadTokenSessionBody = await c.req.json();

			const dealId = await decodeWarmLeadToken(body.token);
			if (!dealId) {
				return serveBadRequest(c, 'This link is invalid or has expired. Please request a new invite.');
			}

			const { user, dealApplicationId } = await this.service.getWarmLeadContextByDealId(dealId);

			const [token, serializedUser, financialWizardProgress, onboardingProgress, teams] = await Promise.all([
				encode(user.id, user.email, dealId, dealApplicationId),
				serializeUser(user),
				this.financialWizardService.getProgress(user.id, dealApplicationId),
				this.service.getProgress(user.id, dealApplicationId),
				this.teamService.getUserTeams(user.id),
			]);

			return c.json({
				token,
				deal_application_id: dealApplicationId,
				user: serializedUser,
				financialWizardProgress,
				onboardingProgress,
				teams,
			});
		} catch (error) {
			logger.error(error);
			if (error instanceof Error && error.message.includes('No processed deal')) {
				return serveBadRequest(c, 'Deal not found or not yet processed. Please try again shortly.');
			}
			if (error instanceof Error && error.message.includes('no associated user')) {
				return serveBadRequest(c, 'No account linked to this deal yet. Please wait for your invite email.');
			}
			return serveInternalServerError(c, error);
		}
	};

	public createWarmLeadPasswordSession = async (c: Context) => {
		try {
			const body: WarmLeadPasswordSessionBody = await c.req.json();

			const dealId = await decodeWarmLeadToken(body.token);
			if (!dealId) {
				return serveBadRequest(c, 'This link is invalid or has expired. Please request a new invite.');
			}

			const { user, dealApplicationId } = await this.service.getWarmLeadContextByDealId(dealId);
			if (!(await this.service.verifyApplicationPassword(dealApplicationId, body.password, user.password))) {
				return serveBadRequest(c, 'That temporary password is incorrect. Check the email from Assembled Brands and try again.');
			}

			const [token, serializedUser, financialWizardProgress, onboardingProgress, teams] = await Promise.all([
				encode(user.id, user.email, dealId, dealApplicationId),
				serializeUser(user),
				this.financialWizardService.getProgress(user.id, dealApplicationId),
				this.service.getProgress(user.id, dealApplicationId),
				this.teamService.getUserTeams(user.id),
			]);

			return c.json({
				token,
				deal_application_id: dealApplicationId,
				user: serializedUser,
				financialWizardProgress,
				onboardingProgress,
				teams,
			});
		} catch (error) {
			logger.error(error);
			if (error instanceof Error && error.message.includes('No processed deal')) {
				return serveBadRequest(c, 'Deal not found or not yet processed. Please try again shortly.');
			}
			if (error instanceof Error && error.message.includes('no associated user')) {
				return serveBadRequest(c, 'No account linked to this deal yet. Please wait for your invite email.');
			}
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Unauthenticated magic-link re-login fallback.
	 * Takes only an email, resolves the user's active deal, and emails a fresh
	 * signed deep link (the /signin?token flow) so returning applicants and
	 * teammates can sign back in if they do not have the temp password handy. Returns { ok: true } when a
	 * link was sent and { ok: false } when no matching account/application exists,
	 * so the UI can show a clear "we couldn't find your account" message.
	 */
	public requestLoginLink = async (c: Context) => {
		try {
			const body: LoginLinkBody = await c.req.json();
			const email = body.email.trim().toLowerCase();

			// Applicants own a deal directly; teammates reach it through the host of
			// a team they belong to. Resolve either path before emailing.
			const user = await this.userService.findByEmail(email);
			let dealContext: { dealId: number; dealApplicationId: number } | null = null;
			if (user) {
				dealContext = await this.service.getActiveDealContextForUser(user.id);
				if (!dealContext) {
					const memberships = await this.teamService.getUserTeams(user.id);
					for (const membership of memberships) {
						const hostId = await this.teamService.getTeamHostUserId(membership.team_id);
						if (!hostId || hostId === user.id) continue;
						const hostContext = await this.service.getActiveDealContextForUser(hostId);
						if (hostContext) {
							dealContext = hostContext;
							break;
						}
					}
				}
			}

			if (!user || !dealContext) {
				logger.info({ email }, 'Login link requested for unknown account');
				return c.json({ ok: false });
			}

			// Carry the exact user (not the deal's owner) so teammates sign in as
			// themselves, scoped to the host's deal.
			const token = await encodeLoginToken(user.id, dealContext.dealId, dealContext.dealApplicationId);
			const webAppUrl = env.WEBAPP_URL || 'https://webapp-omega-rosy.vercel.app';
			const loginUrl = `${webAppUrl}/signin?token=${encodeURIComponent(token)}`;
			const firstName = user.first_name || 'there';

			await sendTemplateEmail(email, firstName, env.TRANSACTIONAL_EMAIL_TEMPLATE_ID, {
				subject: 'Your sign-in link for Assembled Brands',
				title: 'Sign back in',
				subtitle: 'Assembled Brands',
				name: firstName,
				body: `Hi ${firstName}, click the button below to securely sign back in to your Assembled Brands application. For your security, this link will expire after a while — just request a new one any time.`,
				buttonText: 'Sign in to my application',
				buttonLink: loginUrl,
			});
			logger.info({ email }, 'Login link sent');

			return c.json({ ok: true });
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Unauthenticated re-login "magic link" exchange.
	 * Verifies the signed login token (which carries the exact user + their deal
	 * context) and mints a session for that user — works for applicants and
	 * teammates alike, signing each in as themselves.
	 */
	public createLoginSession = async (c: Context) => {
		try {
			const body: LoginSessionBody = await c.req.json();

			const decoded = await decodeLoginToken(body.token);
			if (!decoded) {
				return serveBadRequest(c, 'This sign-in link is invalid or has expired. Please request a new one.');
			}

			const user = await this.userService.find(decoded.userId);
			if (!user) {
				return serveBadRequest(c, 'This sign-in link is invalid or has expired. Please request a new one.');
			}

			const { dealId, dealApplicationId } = decoded;

			const [token, serializedUser, financialWizardProgress, onboardingProgress, teams] = await Promise.all([
				encode(user.id, user.email, dealId, dealApplicationId),
				serializeUser(user),
				this.financialWizardService.getProgress(user.id, dealApplicationId),
				this.service.getProgress(user.id, dealApplicationId),
				this.teamService.getUserTeams(user.id),
			]);

			return c.json({
				token,
				deal_application_id: dealApplicationId,
				user: serializedUser,
				financialWizardProgress,
				onboardingProgress,
				teams,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	public createPasswordLoginSession = async (c: Context) => {
		try {
			const body: PasswordLoginSessionBody = await c.req.json();
			const email = body.email.trim().toLowerCase();
			const user = await this.userService.findByEmail(email);
			if (!user) {
				return serveBadRequest(c, 'Invalid email or temporary password.');
			}

			let dealContext = await this.service.getDealContextForUserByPassword(user.id, body.password);
			const legacyPasswordValid = !dealContext && verify(body.password, user.password);
			if (!dealContext && !legacyPasswordValid) {
				return serveBadRequest(c, 'Invalid email or temporary password.');
			}
			if (!dealContext) {
				dealContext = await this.service.getActiveDealContextForUser(user.id);
			}
			if (!dealContext) {
				const memberships = await this.teamService.getUserTeams(user.id);
				for (const membership of memberships) {
					const team = await this.teamService.getTeamById(membership.team_id);
					if (team?.deal_application_id != null) {
						dealContext = await this.service.getDealContextByDealApplicationId(team.deal_application_id);
					}
					if (!dealContext) {
						const hostId = await this.teamService.getTeamHostUserId(membership.team_id);
						if (!hostId || hostId === user.id) continue;
						dealContext = await this.service.getActiveDealContextForUser(hostId);
					}
					if (dealContext) break;
				}
			}

			if (!dealContext) {
				return serveBadRequest(c, "We couldn't find an active application for this account.");
			}

			const { dealId, dealApplicationId } = dealContext;
			const [token, serializedUser, financialWizardProgress, onboardingProgress, teams] = await Promise.all([
				encode(user.id, user.email, dealId, dealApplicationId),
				serializeUser(user),
				this.financialWizardService.getProgress(user.id, dealApplicationId),
				this.service.getProgress(user.id, dealApplicationId),
				this.teamService.getUserTeams(user.id),
			]);

			return c.json({
				token,
				deal_application_id: dealApplicationId,
				user: serializedUser,
				financialWizardProgress,
				onboardingProgress,
				teams,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};
}
