import { serveStatic } from '@hono/node-server/serve-static';
import { swaggerUI } from '@hono/swagger-ui';
import type { Worker } from 'bullmq';
import { Hono } from 'hono';
import { jwt } from 'hono/jwt';


import { logger } from '../lib/logger.js';
import { connection } from '../lib/queue.js';

import {
  assetQueryValidator,
  completeMultipartUploadValidator,
  createMultipartAssetValidator,
} from './validator/asset.ts';



import {
  createTeamValidator,
  inviteMemberValidator,
  revokeAccessValidator,
  teamQueryValidator,
} from './validator/team.ts';

import {
  emailVerificationValidator,
  inAppResetPasswordValidator,
  loginValidator,
  registerTokenValidator,
  registrationValidator,
  requestResetPasswordValidator,
  resetPasswordValidator,
  updateUserDetailsValidator,
  uploadProfileImageValidator,
} from './validator/user.js';
import { ERRORS, serveInternalServerError, serveNotFound } from './controller/resp/error.js';
import { AuthController } from './controller/auth.js';
import { env } from 'cloudflare:workers';
import { AssetController } from './controller/asset.js';
import { BusinessController } from './controller/business.js';
import { GoogleController } from './controller/google.js';
import { SubscriptionController } from './controller/subscription.js';
import { TeamController } from './controller/team.js';
import { teamAccess } from './middleware/team.js';

export class Server {
  private app: Hono;
  private worker?: Worker;

  constructor(app: Hono) {
    this.app = app;
  }

  public async configure() {
    // Index path
    this.app.get('/', (c) => {
      return c.text('Ok');
    });

    // Static files
    this.app.use('/static/*', serveStatic({ root: './' }));

    // API Doc
    this.app.get('/doc', swaggerUI({ url: '/static/openapi.yaml' }));

    // Universal catchall
    this.app.notFound((c) => {
      return serveNotFound(c, ERRORS.NOT_FOUND);
    });

    // Error handling
    this.app.onError((err, c) => {
      return serveInternalServerError(c, err);
    });

    const api = this.app.basePath('/v1');

    // Setup repos
    const userRepo = new UserRepository();
    const assetRepo = new AssetRepository();
    const subscriptionRepo = new SubscriptionRepository();
    const teamRepo = new TeamRepository();
    const contactRepo = new ContactRepository();
    const businessRepo = new BusinessRepository();
    const paymentRepo = new PaymentRepository();
    const callbackRepo = new CallbackRepository();
    const podcastRepo = new PodcastRepository();
    const courseRepo = new CourseRepository();
    const emailRepo = new EmailRepository();
    const telemetryRepo = new TelemetryRepository();
    const notificationRepo = new NotificationRepository();
    const clickRepo = new ClickRepository();
    // Setup services
    const notificationService = new NotificationService(notificationRepo);
    const contactService = new ContactService(contactRepo);
    const s3Service = new S3Service();
    const stripeService = new StripeService();

    // Initialize Stripe service with AWS Secrets Manager
    await stripeService.initialize();

    const leadService = new LeadService(
      leadRepo,
      contactService,
      stripeService,
      notificationService,
    );

    const assetService = new AssetService(assetRepo, s3Service);
    const eventService = new EventService(eventRepo, s3Service, leadService, assetService);
    const bookingRepo = new BookingRepository();
    const membershipRepo = new MembershipRepository();
    const membershipService = new MembershipService(membershipRepo);
    const bookingService = new BookingService(bookingRepo, notificationService);

    const userService = new UserService(
      userRepo,
      stripeService,
      membershipService,
      eventService,
      leadService,
    );
    const subscriptionService = new SubscriptionService(
      subscriptionRepo,
      stripeService,
      userService,
    );
    const teamService = new TeamService(teamRepo, userService);
    const paymentService = new PaymentService(paymentRepo, notificationService);
    const businessService = new BusinessService(businessRepo, s3Service, assetService, teamService);
    const emailService = new EmailService(emailRepo);
    const icsService = new ICSService(assetService);
    // Setup workers
    this.registerWorker(userService, emailService);

    // Setup controllers
    const authController = new AuthController(
      userService,
      businessService,
      s3Service,
      assetService,
      userRepo,
    );
    const assetController = new AssetController(
      assetService,
      userService,
      eventService,
      leadService,
      emailService,
      notificationService,
    );

    const stripeController = new StripeController(
      stripeService,
      userService,
      subscriptionRepo,
      leadService,
      paymentService,
      eventService,
      membershipService,
      bookingService,
      businessService,
      notificationService,
      icsService,
    );
    const subscriptionController = new SubscriptionController(
      subscriptionService,
      stripeService,
      userService,
    );
    const businessController = new BusinessController(businessService, userService);

    // Add team service and controller

    const teamController = new TeamController(teamService, userService, businessService);

    // Add Google service and controller
    const googleService = new GoogleService(userService, stripeService);
    const googleController = new GoogleController(googleService, s3Service, userRepo);

    // Setup controllers

    // Register routes

    this.registerUserRoutes(api, authController, googleController);

    this.registerAssetRoutes(api, assetController, teamService);
    this.registerStripeRoutes(api, stripeController);
    this.registerSubscriptionRoutes(api, subscriptionController);
    this.registerBusinessRoutes(api, businessController);
    this.registerTeamRoutes(api, teamController);



  }

  private registerUserRoutes(api: Hono, authCtrl: AuthController, googleCtrl: GoogleController) {
    const user = new Hono();
    const authCheck = jwt({ secret: env.SECRET_KEY });

    user.get('/me', authCheck, authCtrl.me);
    user.get('/dashboard', authCheck, authCtrl.getDashboard);
    user.post('/login', loginValidator, authCtrl.login);
    user.post('/register', registrationValidator, authCtrl.register);
    user.post('/send-token', emailVerificationValidator, authCtrl.sendToken);
    user.post('/verify-registration', registerTokenValidator, authCtrl.verifyRegistrationToken);
    user.post(
      '/request-reset-password',
      requestResetPasswordValidator,
      authCtrl.requestResetPassword,
    );
    user.post('/reset-password', resetPasswordValidator, authCtrl.resetPassword);
    user.post(
      '/reset-password-in-app',
      authCheck,
      inAppResetPasswordValidator,
      authCtrl.resetPasswordInApp,
    );
    user.put('/details', authCheck, updateUserDetailsValidator, authCtrl.updateUserDetails);

    // Add Google auth routes
    user.get('/auth/google', googleCtrl.initiateAuth);
    user.get('/auth/google/callback', googleCtrl.handleCallback);
    user.post(
      '/upload-profile-image',
      authCheck,
      uploadProfileImageValidator,
      authCtrl.uploadProfileImage,
    );
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
    asset.post(
      '/:id/complete',
      completeMultipartUploadValidator,
      assetCtrl.completeMultipartUpload,
    );
    asset.post('/:id/start-hls-conversion', assetCtrl.startHlsConversion);
    asset.put('/:id/rename', assetCtrl.renameAsset);
    asset.delete('/:id', assetCtrl.deleteAsset);

    api.route('/asset', asset);
  }

  private registerStripeRoutes(api: Hono, stripeCtrl: StripeController) {
    const stripe = new Hono();
    const authCheck = jwt({ secret: env.SECRET_KEY });

    // OAuth routes
    stripe.get('/connect/oauth', authCheck, stripeCtrl.initiateOAuth);
    stripe.get('/connect/oauth/callback', authCheck, stripeCtrl.handleOAuthCallback);
    stripe.get('/product/:id/:priceId', authCheck, stripeCtrl.getProduct);
    stripe.get('/list/payment/methods', authCheck, stripeCtrl.getCardDetails);

    // Webhook
    stripe.post('/webhook', stripeCtrl.handleWebhook);

    api.route('/stripe', stripe);
  }

  private registerSubscriptionRoutes(api: Hono, subscriptionCtrl: SubscriptionController) {
    const subscription = new Hono();
    const authCheck = jwt({ secret: env.SECRET_KEY });

    subscription.get('/', authCheck, subscriptionCtrl.getSubscriptions);
    subscription.post(
      '/subscribe',
      authCheck,
      subscriptionRequestValidator,
      subscriptionCtrl.subscribe,
    );
    subscription.delete('/', authCheck, subscriptionCtrl.cancelSubscription);

    api.route('/subscription', subscription);
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
    team.get('/dashboard', authCheck, teamCtrl.getTeamDashboard);
    team.get('/invitations', authCheck, teamQueryValidator, teamCtrl.getTeamInvitations);
    team.get('/my-invitations', authCheck, teamQueryValidator, teamCtrl.getMyInvitations);
    team.delete('/invitations/:id', authCheck, teamCtrl.deleteInvitation);
    team.post('/invitations/:id/accept', teamCtrl.acceptInvitation);
    team.post('/invitations/:id/reject', teamCtrl.rejectInvitation);
    team.get('/my-team/members', teamQueryValidator, authCheck, teamCtrl.getMyTeamMembers);
    team.get('/my-teams', authCheck, teamCtrl.getMyTeams);
    team.post('/revoke-access', authCheck, revokeAccessValidator, teamCtrl.revokeAccess);

    api.route('/team', team);
  }










  private registerWorker(userService: UserService, emailService: EmailService) {
    const tasker = new Tasker(userService, emailService);
    const worker = tasker.setup();
    if (worker.isRunning()) {
      logger.info('Worker is running');
    }
    this.worker = worker;
  }

  public async shutDownWorker() {
    await this.worker?.close();
    await connection.quit();
  }



}
