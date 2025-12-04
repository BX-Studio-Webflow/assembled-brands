import { serveStatic } from '@hono/node-server/serve-static';
import { swaggerUI } from '@hono/swagger-ui';
import type { Worker } from 'bullmq';
import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

import env from '../lib/env.js';
import { logger } from '../lib/logger.js';
import { connection } from '../lib/queue.js';
import { AdminRepository } from '../repository/admin.js';
import { AssetRepository } from '../repository/asset.js';
import { BookingRepository } from '../repository/booking.ts';
import { BusinessRepository } from '../repository/business.js';
import { CallbackRepository } from '../repository/callback.ts';
import { ClickRepository } from '../repository/click.ts';
import { ContactRepository } from '../repository/contact.ts';
import { CourseRepository } from '../repository/course.ts';
import { EmailRepository } from '../repository/email.ts';
import { EventRepository } from '../repository/event.ts';
import { LeadRepository } from '../repository/lead.js';
import { MembershipRepository } from '../repository/membership.ts';
import { NotificationRepository } from '../repository/notification.ts';
import { PaymentRepository } from '../repository/payment.ts';
import { PodcastRepository } from '../repository/podcast.js';
import { SubscriptionRepository } from '../repository/subscription.js';
import { TeamRepository } from '../repository/team.js';
import { TelemetryRepository } from '../repository/telemetry.ts';
import { UserRepository } from '../repository/user.js';
import { AdminService } from '../service/admin.js';
import { AssetService } from '../service/asset.js';
import { BookingService } from '../service/booking.ts';
import { BusinessService } from '../service/business.js';
import { CallbackService } from '../service/callback.ts';
import { ClickService } from '../service/click.ts';
import { ContactService } from '../service/contact.ts';
import { CourseService } from '../service/course.ts';
import { EmailService } from '../service/email.ts';
import { EventService } from '../service/event.ts';
import { GoogleService } from '../service/google.js';
import { ICSService } from '../service/ics.ts';
import { LeadService } from '../service/lead.js';
import { MembershipService } from '../service/membership.ts';
import { NotificationService } from '../service/notification.ts';
import { PaymentService } from '../service/payment.ts';
import { PodcastService } from '../service/podcast.js';
import { S3Service } from '../service/s3.js';
import { StripeService } from '../service/stripe.js';
import { SubscriptionService } from '../service/subscription.js';
import { TeamService } from '../service/team.js';
import { TelemetryService } from '../service/telemetry.ts';
import { UserService } from '../service/user.js';
import { WebSocketService } from '../service/websocket.ts';
import { Tasker } from '../task/tasker.js';
import { AdminController } from './controller/admin.js';
import { AssetController } from './controller/asset.js';
import { AuthController } from './controller/auth.js';
import { BookingController } from './controller/booking.ts';
import { BusinessController } from './controller/business.js';
import { CallbackController } from './controller/callback.ts';
import { ClickController } from './controller/click.ts';
import { ContactController } from './controller/contact.ts';
import { CourseController } from './controller/course.js';
import { EmailController } from './controller/email.ts';
import { EventController } from './controller/event.ts';
import { GoogleController } from './controller/google.js';
import { LeadController } from './controller/lead.ts';
import { MembershipController } from './controller/membership.ts';
import { NotificationController } from './controller/notification.ts';
import { PodcastController } from './controller/podcast.js';
import { ProxyController } from './controller/proxy.ts';
import { ERRORS, serveInternalServerError, serveNotFound } from './controller/resp/error.js';
import { S3Controller } from './controller/s3.js';
import { StripeController } from './controller/stripe.js';
import { SubscriptionController } from './controller/subscription.js';
import { TeamController } from './controller/team.js';
import { TelemetryController } from './controller/telemetry.ts';
import { teamAccess } from './middleware/team.ts';
import { adminCreateUserValidator } from './validator/admin.ts';
import {
  assetQueryValidator,
  completeMultipartUploadValidator,
  createMultipartAssetValidator,
} from './validator/asset.ts';
import {
  businessQueryValidator,
  businessValidator,
  uploadBusinessLogoValidator,
} from './validator/business.js';
import { callbackValidator, updateCallbackValidator } from './validator/callback.ts';
import { createClickValidator, updateClickValidator } from './validator/click.ts';
import {
  archiveCourseValidator,
  courseQueryValidator,
  courseValidator,
  lessonValidator,
  moduleValidator,
  progressValidator,
  updateCourseValidator,
} from './validator/course.ts';
import {
  bulkEmailValidator,
  createBulkEmailValidator,
  toggleBulkEmailValidator,
  updateBulkEmailValidator,
  updateFollowUpEmailValidator,
} from './validator/email.ts';
import {
  cancelEventValidator,
  eventStreamValidator,
  eventValidator,
  updateEventValidator,
} from './validator/event.ts';
import { eventQueryValidator } from './validator/event.ts';
import {
  bulkDeleteLeadValidator,
  eventLinkValidator,
  externalFormValidator,
  leadBulkValidator,
  leadSearchValidator,
  leadValidator,
  purchaseMembershipValidator,
  tagAssignmentValidator,
  tagValidator,
  updateLeadValidator,
} from './validator/lead.ts';
import { membershipQueryValidator, membershipValidator } from './validator/membership.ts';
import {
  createNotificationValidator,
  updateNotificationValidator,
} from './validator/notification.ts';
import {
  podcastEpisodeValidator,
  podcastQueryValidator,
  podcastValidator,
  updateEpisodeValidator,
  updatePodcastValidator,
} from './validator/podcast.ts';
import { subscriptionRequestValidator } from './validator/subscription.ts';
import {
  createTeamValidator,
  inviteMemberValidator,
  revokeAccessValidator,
  teamQueryValidator,
} from './validator/team.ts';
import {
  createLobbyTelemetryValidator,
  createTelemetryValidator,
  leaveEventValidator,
  leaveLobbyValidator,
  updateTelemetryValidator,
  updateWatchTimeValidator,
} from './validator/telemetry.ts';
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

export class Server {
  private app: Hono;
  private worker?: Worker;
  private wsService?: WebSocketService;

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
    const leadRepo = new LeadRepository();
    const eventRepo = new EventRepository();
    const adminRepo = new AdminRepository();
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
    const clickService = new ClickService(clickRepo);
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
    const adminService = new AdminService(adminRepo);
    const bookingRepo = new BookingRepository();
    const membershipRepo = new MembershipRepository();
    const membershipService = new MembershipService(membershipRepo);
    const bookingService = new BookingService(bookingRepo, notificationService);

    const courseService = new CourseService(courseRepo, s3Service);
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
    const callbackService = new CallbackService(callbackRepo);
    const podcastService = new PodcastService(podcastRepo, s3Service);
    const emailService = new EmailService(emailRepo);
    const telemetryService = new TelemetryService(telemetryRepo);
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
    const leadController = new LeadController(
      leadService,
      userService,
      eventService,
      membershipService,
      stripeService,
      bookingService,
      contactService,
      paymentService,
      businessService,
      callbackService,
      teamService,
      icsService,
      assetService,
    );
    const eventController = new EventController(
      eventService,
      userService,
      leadService,
      membershipService,
      businessService,
      clickService,
      callbackService,
      telemetryService,
      teamService,
    );
    const adminController = new AdminController(
      adminService,
      userService,
      eventService,
      leadService,
      assetService,
    );
    const s3Controller = new S3Controller(s3Service);
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
    const bookingCtrl = new BookingController(bookingService, userService, teamService);
    const emailController = new EmailController(
      emailService,
      userService,
      leadService,
      businessService,
      eventService,
      membershipService,
    );
    const businessController = new BusinessController(businessService, userService);
    const membershipController = new MembershipController(
      membershipService,
      userService,
      teamService,
    );

    // Add team service and controller

    const teamController = new TeamController(teamService, userService, businessService);
    const contactController = new ContactController(contactService, stripeService, paymentService);

    // Add Google service and controller
    const googleService = new GoogleService(userService, stripeService);
    const googleController = new GoogleController(googleService, s3Service, userRepo);

    // Setup controllers
    const callbackController = new CallbackController(
      callbackService,
      userService,
      eventService,
      leadService,
    );
    const podcastController = new PodcastController(
      podcastService,
      userService,
      membershipService,
      teamService,
    );
    const courseController = new CourseController(
      courseService,
      userService,
      membershipService,
      teamService,
    );
    const telemetryController = new TelemetryController(
      telemetryService,
      leadService,
      eventService,
    );
    const notificationController = new NotificationController(notificationService, userService);
    const clickController = new ClickController(clickService, userService);
    const proxyController = new ProxyController();

    // Register routes
    this.registerProxyRoutes(api, proxyController);
    this.registerUserRoutes(api, authController, googleController);
    this.registerLeadRoutes(api, leadController, teamService);
    this.registerEventRoutes(api, eventController, teamService);
    this.registerAdminRoutes(api, adminController);
    this.registerS3Routes(api, s3Controller);
    this.registerAssetRoutes(api, assetController, teamService);
    this.registerStripeRoutes(api, stripeController);
    this.registerSubscriptionRoutes(api, subscriptionController);
    this.registerBookingRoutes(api, bookingCtrl);
    this.registerBusinessRoutes(api, businessController);
    this.registerMembershipRoutes(api, membershipController, teamService);
    this.registerTeamRoutes(api, teamController);
    this.registerContactRoutes(api, contactController);
    this.registerCallbackRoutes(api, callbackController, teamService);
    this.registerPodcastRoutes(api, podcastController, teamService);
    this.registerCourseRoutes(api, courseController, teamService);
    this.registerEmailRoutes(api, emailController, teamService);
    this.registerTelemetryRoutes(api, telemetryController, teamService);
    this.registerNotificationRoutes(api, notificationController);
    this.registerClickRoutes(api, clickController);

    // Initialize WebSocket service with existing event service
    this.wsService = new WebSocketService(
      Number.parseInt(env.WEBSOCKET_PORT),
      eventService,
      telemetryService,
      notificationService,
    );
    logger.info(`WebSocket service initialized on port: ${env.WEBSOCKET_PORT}`);
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

  private registerLeadRoutes(api: Hono, leadCtrl: LeadController, teamService: TeamService) {
    const lead = new Hono();
    const authCheck = jwt({ secret: env.SECRET_KEY });

    // Unauthenticated routes
    lead.post('/lead-validate-event', eventLinkValidator, leadCtrl.validateEventLink);
    lead.post('/validate-ticket-payment', eventLinkValidator, leadCtrl.validateTicketPayment);
    lead.post('/external-form', externalFormValidator, leadCtrl.handleExternalForm);
    lead.post('/purchase-membership', purchaseMembershipValidator, leadCtrl.purchaseMembership);

    // Apply auth middleware for authenticated routes
    lead.use(authCheck);
    lead.use(teamAccess(teamService));

    // Authenticated routes
    lead.get('/', leadCtrl.getLeads);
    lead.get('/:id', leadCtrl.getLead);
    lead.post('/', leadValidator, leadCtrl.createLead);
    lead.post('/bulk', leadBulkValidator, leadCtrl.bulkCreateLead);
    lead.post('/search', leadSearchValidator, leadCtrl.searchLeads);
    lead.put('/:id', updateLeadValidator, leadCtrl.updateLead);
    lead.delete('/:id', leadCtrl.deleteLead);
    lead.post('/unique-leads', leadCtrl.getUniqueLeads);
    lead.post('/tag', tagValidator, leadCtrl.createTag);
    lead.delete('/tag/:id', leadCtrl.deleteTag);
    lead.get('/tags/host', leadCtrl.getTags);
    lead.delete('/tag/:id/lead/:lead_id', leadCtrl.unassignTag);
    lead.post('/tag/assign', tagAssignmentValidator, leadCtrl.assignTag);
    lead.post('/bulk-delete', bulkDeleteLeadValidator, leadCtrl.bulkDeleteLeads);

    api.route('/lead', lead);
  }

  private registerEventRoutes(api: Hono, eventCtrl: EventController, teamService: TeamService) {
    const event = new Hono();
    const authCheck = jwt({ secret: env.SECRET_KEY });

    // Unauthenticated routes
    event.get('/server-time', eventCtrl.getServerTime);
    event.get('/:id', eventCtrl.getEvent);
    event.get('/:id/memberships', eventCtrl.getEventMemberships);
    event.post('/stream', eventStreamValidator, eventCtrl.streamPrerecordedEvent);

    // Apply auth middleware for authenticated routes
    event.use(authCheck);
    event.use(teamAccess(teamService));

    // Authenticated routes
    event.get('/', eventQueryValidator, eventCtrl.getEvents);
    event.post('/', eventValidator, eventCtrl.createEvent);
    event.put('/:id', updateEventValidator, eventCtrl.updateEvent);
    event.delete('/:id', eventCtrl.deleteEvent);
    event.post('/cancel', cancelEventValidator, eventCtrl.cancelEvent);

    api.route('/event', event);
  }

  private registerAdminRoutes(api: Hono, adminCtrl: AdminController) {
    const admin = new Hono();
    const authCheck = jwt({ secret: env.SECRET_KEY });

    admin.get('/user/:id', authCheck, adminCtrl.getParticularUser);
    admin.put('/user/:id', authCheck, adminCtrl.updateParticularUser);
    admin.get('/users', authCheck, adminCtrl.getUsers);
    admin.post('/user', authCheck, adminCreateUserValidator, adminCtrl.createUser);
    admin.get('/leads', authCheck, adminCtrl.getLeads);
    admin.get('/events', authCheck, adminCtrl.getEvents);
    admin.delete('/user/:id', authCheck, adminCtrl.deleteUser);

    api.route('/admin', admin);
  }

  private registerS3Routes(api: Hono, s3Ctrl: S3Controller) {
    const s3 = new Hono();
    const authCheck = jwt({ secret: env.SECRET_KEY });

    s3.post('/presigned-url', authCheck, s3Ctrl.generatePresignedUrl);
    api.route('/s3', s3);
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

  private registerBookingRoutes(api: Hono, bookingCtrl: BookingController) {
    const booking = new Hono();

    booking.post('/', bookingCtrl.createBooking);
    booking.get('/lead/:lead_id', bookingCtrl.getBookingsByLead);

    api.route('/booking', booking);
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

  private registerMembershipRoutes(
    api: Hono,
    membershipCtrl: MembershipController,
    teamService: TeamService,
  ) {
    const membership = new Hono();
    const authCheck = jwt({ secret: env.SECRET_KEY });

    // Unauthenticated routes
    membership.get('/:id', membershipCtrl.getMembership);
    membership.get('/:id/dates-for-plan', membershipCtrl.getEventDates);

    // Apply auth middleware for authenticated routes
    membership.use(authCheck);
    membership.use(teamAccess(teamService));

    // Authenticated routes
    membership.get('/', membershipQueryValidator, membershipCtrl.getMemberships);
    membership.post('/', membershipValidator, membershipCtrl.createMembership);
    membership.put('/:id', membershipValidator, membershipCtrl.updateMembership);
    membership.delete('/:id', membershipCtrl.deleteMembership);
    membership.delete('/:id/dates/:dateId', membershipCtrl.deleteMembershipDate);

    api.route('/membership', membership);
  }

  private registerContactRoutes(api: Hono, contactCtrl: ContactController) {
    const contact = new Hono();
    const authCheck = jwt({ secret: env.SECRET_KEY });

    contact.post('/login', contactCtrl.login);
    contact.get('/me', authCheck, contactCtrl.me);
    contact.get('/payment-methods', authCheck, contactCtrl.paymentMethods);
    contact.post('/send-token', contactCtrl.sendToken);
    contact.post('/verify-registration', contactCtrl.verifyRegistrationToken);
    contact.post('/request-reset-password', contactCtrl.requestResetPassword);
    contact.post('/reset-password', contactCtrl.resetPassword);
    contact.post('/reset-password-in-app', contactCtrl.resetPasswordInApp);
    contact.put('/details', authCheck, contactCtrl.updateContactDetails);

    api.route('/contact', contact);
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

  private registerCallbackRoutes(
    api: Hono,
    callbackCtrl: CallbackController,
    teamService: TeamService,
  ) {
    const callback = new Hono();
    const authCheck = jwt({ secret: env.SECRET_KEY });

    callback.post('/', callbackValidator, callbackCtrl.createCallback);

    // Apply auth middleware for authenticated routes
    callback.use(authCheck);
    callback.use(teamAccess(teamService));

    callback.get('/:id', authCheck, callbackCtrl.getCallback);
    callback.get('/lead/:leadId', authCheck, callbackCtrl.getCallbacksByLeadId);
    callback.get('/uncalled', authCheck, callbackCtrl.getUncalledCallbacks);
    callback.get('/scheduled', authCheck, callbackCtrl.getScheduledCallbacks);
    callback.put('/:id', authCheck, updateCallbackValidator, callbackCtrl.updateCallback);
    callback.delete('/:id', authCheck, callbackCtrl.deleteCallback);
    callback.post('/:id/called', authCheck, callbackCtrl.markCallbackAsCalled);

    api.route('/callback', callback);
  }

  private registerEmailRoutes(api: Hono, emailCtrl: EmailController, teamService: TeamService) {
    const email = new Hono();
    const authCheck = jwt({ secret: env.SECRET_KEY });
    // Automated email routes (triggered by cron jobs)
    email.get('/trigger/countdown', emailCtrl.triggerEmailEventCountdown);
    email.get('/trigger/final-reminder', emailCtrl.triggerEmailFinalReminder);
    email.get('/trigger/event-day', emailCtrl.triggerEmailEventDayReminder);
    email.get('/trigger/thank-you', emailCtrl.triggerEmailThankYouFollowUp);

    // Apply auth middleware for authenticated routes
    email.use(authCheck);
    email.use(teamAccess(teamService));

    email.post('/', bulkEmailValidator, emailCtrl.createBulkEmail);
    email.post('/toggle', toggleBulkEmailValidator, emailCtrl.toggleBulkEmail);
    email.get('/', emailCtrl.getEmails);
    email.post('/follow-up', createBulkEmailValidator, emailCtrl.createFollowUpEmail);
    email.get('/follow-up', emailCtrl.getFollowUpEmails);
    email.put('/follow-up/:id', updateFollowUpEmailValidator, emailCtrl.updateFollowUpEmail);
    email.delete('/follow-up/:id', emailCtrl.deleteFollowUpEmail);
    email.get('/:id', emailCtrl.getEmail);
    email.put('/:id', updateBulkEmailValidator, emailCtrl.updateEmail);
    email.delete('/:id', emailCtrl.deleteEmail);

    api.route('/email', email);
  }

  private registerPodcastRoutes(
    api: Hono,
    podcastCtrl: PodcastController,
    teamService: TeamService,
  ) {
    const podcast = new Hono();
    const authCheck = jwt({ secret: env.SECRET_KEY });

    // Unauthenticated routes
    podcast.get('/:id', podcastCtrl.getPodcast);

    // Apply auth middleware for authenticated routes
    podcast.use(authCheck);
    podcast.use(teamAccess(teamService));

    // Authenticated routes
    podcast.get('/', podcastQueryValidator, podcastCtrl.getPodcasts);
    podcast.post('/', podcastValidator, podcastCtrl.createPodcast);
    podcast.put('/:id', updatePodcastValidator, podcastCtrl.updatePodcast);
    podcast.delete('/:id', podcastCtrl.deletePodcast);

    // Episode routes (all authenticated)
    podcast.post('/:podcastId/episode', podcastEpisodeValidator, podcastCtrl.addEpisode);
    podcast.get('/:podcastId/episodes', podcastCtrl.getEpisodes);
    podcast.put('/episode/:episodeId', updateEpisodeValidator, podcastCtrl.updateEpisode);
    podcast.delete('/episode/:episodeId', podcastCtrl.deleteEpisode);

    api.route('/podcast', podcast);
  }

  private registerCourseRoutes(api: Hono, courseCtrl: CourseController, teamService: TeamService) {
    const course = new Hono();
    const authCheck = jwt({ secret: env.SECRET_KEY });

    // Unauthenticated routes
    course.get('/:id', courseCtrl.getCourse);
    course.get('/:id/memberships', courseCtrl.getCourseMemberships);
    course.get('/:id/modules', courseCtrl.getModules);
    course.get('/:id/modules/:moduleId', courseCtrl.getModule);
    course.get('/:id/modules/:moduleId/lessons/:lessonId', courseCtrl.getLesson);
    course.get('/host/:id', courseCtrl.getHostCourses);

    // Apply auth middleware for authenticated routes
    course.use(authCheck);
    course.use(teamAccess(teamService));

    // Authenticated routes
    course.get('/', courseQueryValidator, courseCtrl.getAllCourses);
    course.post('/', courseValidator, courseCtrl.createCourse);
    course.put('/:id', updateCourseValidator, courseCtrl.updateCourse);
    course.delete('/:id', courseCtrl.deleteCourse);
    course.post('/archive', archiveCourseValidator, courseCtrl.archiveCourse);
    course.post('/:id/memberships', courseCtrl.updateCourseMemberships);
    course.delete('/:id/memberships', courseCtrl.deleteCourseMemberships);

    // Module routes
    course.post('/:id/modules', moduleValidator, courseCtrl.createModule);
    course.put('/:id/modules/:moduleId', moduleValidator, courseCtrl.updateModule);
    course.delete('/:id/modules/:moduleId', courseCtrl.deleteModule);

    // Lesson routes
    course.post('/:id/modules/:moduleId/lessons', lessonValidator, courseCtrl.createLesson);
    course.put(
      '/:id/modules/:moduleId/lessons/:lessonId',
      lessonValidator,
      courseCtrl.updateLesson,
    );
    course.delete('/:id/modules/:moduleId/lessons/:lessonId', courseCtrl.deleteLesson);

    // Progress routes
    course.post('/progress', progressValidator, courseCtrl.updateProgress);
    course.get('/progress', courseCtrl.getProgress);

    api.route('/course', course);
  }

  private registerTelemetryRoutes(
    api: Hono,
    telemetryCtrl: TelemetryController,
    teamService: TeamService,
  ) {
    const telemetry = new Hono();
    const authCheck = jwt({ secret: env.SECRET_KEY });

    // Unauthenticated routes (for lead access)
    telemetry.post('/', createTelemetryValidator, telemetryCtrl.createTelemetry);
    telemetry.post('/watch-time', updateWatchTimeValidator, telemetryCtrl.updateWatchTime);
    telemetry.post('/leave', leaveEventValidator, telemetryCtrl.leaveEvent);
    telemetry.delete('/clear-logs/:eventId', authCheck, telemetryCtrl.clearLogs);
    telemetry.post(
      '/lobby-telemetry',
      createLobbyTelemetryValidator,
      telemetryCtrl.createLobbyTelemetry,
    );
    telemetry.post('/lobby-telemetry/exit', leaveLobbyValidator, telemetryCtrl.leaveLobby);
    telemetry.get('/lobby-telemetry/event/:eventId/analytics', telemetryCtrl.getLobbyAnalytics);

    // Apply auth middleware for authenticated routes
    telemetry.use(authCheck);
    telemetry.use(teamAccess(teamService));

    // Authenticated routes (for hosts/admins)
    telemetry.get('/:id', telemetryCtrl.getTelemetry);
    telemetry.get('/lead/:leadId', telemetryCtrl.getTelemetryByLeadId);
    telemetry.get('/event/:eventId', telemetryCtrl.getTelemetryByEventId);
    telemetry.get('/event/:eventId/active', telemetryCtrl.getActiveSessions);
    telemetry.get('/event/:eventId/analytics', telemetryCtrl.getEventAnalytics);
    telemetry.put('/:id', updateTelemetryValidator, telemetryCtrl.updateTelemetry);
    telemetry.delete('/:id', telemetryCtrl.deleteTelemetry);

    api.route('/telemetry', telemetry);
  }

  private registerNotificationRoutes(api: Hono, notificationCtrl: NotificationController) {
    const notification = new Hono();
    const authCheck = jwt({ secret: env.SECRET_KEY });

    // Apply auth middleware for all notification routes
    notification.use(authCheck);

    // Notification routes
    notification.post('/', createNotificationValidator, notificationCtrl.createNotification);
    notification.get('/my', notificationCtrl.getMyNotifications);
    notification.get('/my/unread', notificationCtrl.getMyUnreadNotifications);
    notification.get('/unread-count', notificationCtrl.getUnreadCount);
    notification.get('/:id', notificationCtrl.getNotification);
    notification.put('/:id', updateNotificationValidator, notificationCtrl.updateNotification);
    notification.post('/:id/read', notificationCtrl.markAsRead);
    notification.post('/mark-all-read', notificationCtrl.markAllAsRead);
    notification.delete('/:id', notificationCtrl.deleteNotification);
    notification.delete('/all', notificationCtrl.deleteAllNotifications);

    api.route('/notification', notification);
  }

  private registerClickRoutes(api: Hono, clickCtrl: ClickController) {
    const click = new Hono();
    const authCheck = jwt({ secret: env.SECRET_KEY });

    // Apply auth middleware for all click routes
    click.use(authCheck);

    // Click analytics routes
    click.post('/', createClickValidator, clickCtrl.createClick);
    click.get('/event/:eventId', clickCtrl.getClicksByEvent);
    click.get('/lead/:leadId', clickCtrl.getClicksByLead);
    click.get('/lead/:leadId/event/:eventId', clickCtrl.getClicksByLeadAndEvent);
    click.get('/type/:type', clickCtrl.getClicksByType);
    click.get('/:id', clickCtrl.getClick);
    click.put('/:id', updateClickValidator, clickCtrl.updateClick);
    click.delete('/:id', clickCtrl.deleteClick);
    click.delete('/event/:eventId', clickCtrl.deleteClicksByEvent);
    click.delete('/lead/:leadId', clickCtrl.deleteClicksByLead);
    click.get('/event/:eventId/count', clickCtrl.getClickCountByEvent);
    click.get('/lead/:leadId/count', clickCtrl.getClickCountByLead);

    api.route('/click', click);
  }

  private registerProxyRoutes(api: Hono, proxyCtrl: ProxyController) {
    const proxy = new Hono();
    proxy.get('/landing', proxyCtrl.proxyLanding);

    api.route('/proxy', proxy);
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
