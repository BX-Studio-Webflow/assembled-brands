import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';

import { loadEnvironmentVariables } from '../lib/secrets.ts';
import { AssetRepository } from '../repository/asset.ts';
import { BusinessRepository } from '../repository/business.ts';
import { EmailRepository } from '../repository/email.ts';
import { FinancialWizardRepository } from '../repository/financial-wizard.ts';
import { NotificationRepository } from '../repository/notification.ts';
import { OnboardingWizardRepository } from '../repository/onboarding-wizard.ts';
import { TeamRepository } from '../repository/team.ts';
import { UserRepository } from '../repository/user.ts';
import { schema } from '../schema/index.ts';
import { AssetService } from '../service/asset.ts';
import { BusinessService } from '../service/business.ts';
import { EmailService } from '../service/email.js';
import { FinancialWizardService } from '../service/financial-wizard.ts';
import { HubSpotService } from '../service/hubspot.ts';
import { NotificationService } from '../service/notification.ts';
import { OnboardingWizardService } from '../service/onboarding-wizard.ts';
import { S3Service } from '../service/s3.ts';
import { TeamService } from '../service/team.js';
import { UserService } from '../service/user.js';
import { AssetController } from './controller/asset.js';
import { AuthController } from './controller/auth.js';
import { BusinessController } from './controller/business.js';
import { FinancialWizardController } from './controller/financial-wizard.ts';
import { OnboardingWizardController } from './controller/onboarding-wizard.ts';
import { ERRORS, serveInternalServerError, serveNotFound } from './controller/resp/error.js';
import { TeamController } from './controller/team.js';
import { teamAccess } from './middleware/team.js';
import { assetQueryValidator, completeMultipartUploadValidator, createMultipartAssetValidator } from './validator/asset.ts';
import { businessQueryValidator, businessValidator, uploadBusinessLogoValidator } from './validator/business.ts';
import {
	documentUploadValidator,
	financialOverviewValidator,
	updatePageValidator,
	updateStepValidator,
} from './validator/financial-wizard.ts';
import { onboardingStep1Validator, onboardingStep2Validator, onboardingStep3Validator } from './validator/onboarding.ts';
import { createTeamValidator, inviteMemberValidator, revokeAccessValidator, teamQueryValidator } from './validator/team.ts';
import {
	claimYourAccountValidator,
	emailVerificationValidator,
	loginValidator,
	registrationValidator,
	requestResetPasswordValidator,
	resetPasswordValidator,
	updateUserDetailsValidator,
	verifyEmailAndSetPasswordValidator,
} from './validator/user.js';

export class Server {
	private app: Hono;

	constructor(app: Hono) {
		this.app = app;
	}

	public async configure() {
		// Index path
		this.app.get('/', (c) => {
			return c.text('Ok');
		});

		// Universal catchall
		this.app.notFound((c) => {
			return serveNotFound(c, ERRORS.NOT_FOUND);
		});

		// Error handling
		this.app.onError((err, c) => {
			return serveInternalServerError(c, err);
		});

		//Allow any origin
		this.app.use(
			'*',
			cors({
				origin: '*',
			}),
		);

		const api = this.app.basePath('/api/v1');

		// Load environment variables
		loadEnvironmentVariables(env);

		// Initialize drizzle database connection
		const db = drizzle(env.DB, { schema: schema });

		// Setup repos
		const userRepo = new UserRepository(db);
		const assetRepo = new AssetRepository(db);
		const teamRepo = new TeamRepository(db);
		const businessRepo = new BusinessRepository(db);
		const financialWizardRepo = new FinancialWizardRepository(db);
		const onboardingWizardRepo = new OnboardingWizardRepository(db);
		const emailRepo = new EmailRepository(db);
		const notificationRepo = new NotificationRepository(db);

		// Setup services
		const notificationService = new NotificationService(notificationRepo);
		const s3Service = new S3Service();
		const assetService = new AssetService(assetRepo, s3Service);
		const userService = new UserService(userRepo);
		const teamService = new TeamService(teamRepo, userService);
		const financialWizardService = new FinancialWizardService(financialWizardRepo, assetService);
		const hubSpotService = new HubSpotService();
		const onboardingWizardService = new OnboardingWizardService(onboardingWizardRepo, hubSpotService, userService);
		const businessService = new BusinessService(businessRepo, s3Service, assetService, teamService, financialWizardService);
		const emailService = new EmailService(emailRepo);

		// Setup controllers
		const authController = new AuthController(
			userService,
			businessService,
			s3Service,
			assetService,
			userRepo,
			financialWizardService,
			onboardingWizardService,
		);
		const assetController = new AssetController(assetService, userService, emailService, notificationService);

		const businessController = new BusinessController(businessService, userService);
		const financialWizardController = new FinancialWizardController(financialWizardService, userService, assetService, businessService);
		const onboardingWizardController = new OnboardingWizardController(onboardingWizardService, userService);

		// Add team service and controller

		const teamController = new TeamController(teamService, userService, businessService);

		// Setup controllers

		// Register routes

		this.registerUserRoutes(api, authController);
		this.registerAssetRoutes(api, assetController, teamService);
		this.registerBusinessRoutes(api, businessController);
		this.registerTeamRoutes(api, teamController);
		this.registerFinancialWizardRoutes(api, financialWizardController);
		this.registerOnboardingRoutes(api, onboardingWizardController);
		this.registerGoogleRoutes(api, financialWizardController);
	}

	private registerUserRoutes(api: Hono, authCtrl: AuthController) {
		const user = new Hono();
		const authCheck = jwt({ secret: env.SECRET_KEY });

		user.get('/me', authCheck, authCtrl.me);
		user.post('/login', loginValidator, authCtrl.login);

		user.post('/cold-lead-register', registrationValidator, authCtrl.coldRegister);
		user.post('/verify-registration', verifyEmailAndSetPasswordValidator, authCtrl.verifyEmailAndSetPassword);

		user.post('/claim-your-account', claimYourAccountValidator, authCtrl.claimYourAccount);

		user.post('/send-verification-code', emailVerificationValidator, authCtrl.sendToken);

		user.post('/start-account-recovery', requestResetPasswordValidator, authCtrl.startPasswordReset);
		user.post('/reset-password', resetPasswordValidator, authCtrl.resetPassword);

		user.put('/details', authCheck, updateUserDetailsValidator, authCtrl.updateUserDetails);

		api.route('/user', user);
	}

	private registerAssetRoutes(api: Hono, assetCtrl: AssetController, teamService: TeamService) {
		const asset = new Hono();
		const authCheck = jwt({ secret: env.SECRET_KEY });

		// Unauthenticated routes
		asset.post('/hls-conversion-webhook', assetCtrl.handleHlsConversionWebhook);

		// Apply auth middleware for authenticated routes
		asset.use(authCheck);
		asset.use(teamAccess(teamService));

		// Authenticated routes
		asset.post('/', assetCtrl.createAsset);
		asset.get('/:id', assetCtrl.getAsset);
		asset.get('/', assetQueryValidator, assetCtrl.getAssets);
		asset.post('/multipart', createMultipartAssetValidator, assetCtrl.createMultipartAsset);
		asset.post('/:id/complete', completeMultipartUploadValidator, assetCtrl.completeMultipartUpload);
		asset.put('/:id/rename', assetCtrl.renameAsset);
		asset.delete('/:id', assetCtrl.deleteAsset);

		api.route('/asset', asset);
	}

	private registerBusinessRoutes(api: Hono, businessCtrl: BusinessController) {
		const business = new Hono();
		const authCheck = jwt({ secret: env.SECRET_KEY });

		// Regular user endpoints
		business.get('/my', authCheck, businessCtrl.getMyBusiness);
		business.post('/my', authCheck, businessValidator, businessCtrl.upsertBusiness);
		business.post('/logo', authCheck, uploadBusinessLogoValidator, businessCtrl.updateBusinessLogo);

		// Admin only endpoint
		business.get('/', authCheck, businessQueryValidator, businessCtrl.getAllBusinesses);

		api.route('/business', business);
	}

	private registerTeamRoutes(api: Hono, teamCtrl: TeamController) {
		const team = new Hono();
		const authCheck = jwt({ secret: env.SECRET_KEY });

		team.post('/create', authCheck, createTeamValidator, teamCtrl.createTeam);
		team.post('/invite', authCheck, inviteMemberValidator, teamCtrl.inviteMember);
		team.get('/invitations', authCheck, teamQueryValidator, teamCtrl.getTeamInvitations);
		team.get('/invitations/:id', teamCtrl.getInvitation);
		team.get('/my-invitations', authCheck, teamQueryValidator, teamCtrl.getMyInvitations);
		team.delete('/invitations/:id', authCheck, teamCtrl.deleteInvitation);
		team.post('/invitations/:id/accept', teamCtrl.acceptInvitation);
		team.post('/invitations/:id/reject', teamCtrl.rejectInvitation);
		team.get('/my-team/members', teamQueryValidator, authCheck, teamCtrl.getMyTeamMembers);
		team.get('/my-teams', authCheck, teamCtrl.getMyTeams);
		team.post('/revoke-access', authCheck, revokeAccessValidator, teamCtrl.revokeAccess);

		api.route('/team', team);
	}

	private registerFinancialWizardRoutes(api: Hono, financialWizardCtrl: FinancialWizardController) {
		const financialWizard = new Hono();
		const authCheck = jwt({ secret: env.SECRET_KEY });

		// All routes require authentication
		financialWizard.use(authCheck);

		financialWizard.post('/financial-overview', financialOverviewValidator, financialWizardCtrl.saveFinancialOverview);
		financialWizard.post('/document', documentUploadValidator, financialWizardCtrl.uploadDocument);
		financialWizard.get('/progress', financialWizardCtrl.getProgress);
		financialWizard.get('/documents/:page', financialWizardCtrl.getDocumentsByPage);
		financialWizard.post('/page', updatePageValidator, financialWizardCtrl.updatePage);
		financialWizard.post('/complete', financialWizardCtrl.completeApplication);
		financialWizard.delete('/document/:id', financialWizardCtrl.deleteDocument);

		api.route('/financial-wizard', financialWizard);
	}

	private registerOnboardingRoutes(api: Hono, onboardingWizardCtrl: OnboardingWizardController) {
		const onboardingWizard = new Hono();
		const authCheck = jwt({ secret: env.SECRET_KEY });

		// All routes require authentication
		onboardingWizard.use(authCheck);

		onboardingWizard.post('/step1', onboardingStep1Validator, onboardingWizardCtrl.saveStep1);
		onboardingWizard.post('/step2', onboardingStep2Validator, onboardingWizardCtrl.saveStep2);
		onboardingWizard.post('/step3', onboardingStep3Validator, onboardingWizardCtrl.saveStep3);
		onboardingWizard.get('/progress', onboardingWizardCtrl.getProgress);
		onboardingWizard.post('/step', updateStepValidator, onboardingWizardCtrl.updateStep);
		onboardingWizard.post('/complete', onboardingWizardCtrl.completeApplication);

		api.route('/onboarding-wizard', onboardingWizard);
	}

	private registerGoogleRoutes(api: Hono, financialWizardCtrl: FinancialWizardController) {
		const google = new Hono();
		//const authCheck = jwt({ secret: env.SECRET_KEY });

		// Unauthenticated routes
		google.post('/drive/test', financialWizardCtrl.testGoogleDrive);

		api.route('/google', google);
	}
}
