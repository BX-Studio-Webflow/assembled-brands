import type { Context } from 'hono';
import { env } from 'process';

import { sendTemplateEmail } from '../../lib/email-processor.ts';
import { encrypt, verify } from '../../lib/encryption.js';
import { encode, type JWTPayload } from '../../lib/jwt.ts';
import { logger } from '../../lib/logger.ts';
import type { UserRepository } from '../../repository/user.js';
import { NewUser } from '../../schema/schema.ts';
import type { AssetService } from '../../service/asset.js';
import type { BusinessService } from '../../service/business.js';
import type { S3Service } from '../../service/s3.js';
import type { UserService } from '../../service/user.js';
import { generateSecurePassword } from '../../util/string.ts';
import type {
	ClaimYourAccountBody,
	EmailVerificationBody,
	LoginBody,
	RegistrationBody,
	RequestResetPasswordBody,
	ResetPasswordBody,
	UpdateUserDetailsBody,
	VerifyEmailAndSetPasswordBody,
} from '../validator/user.js';
import { ERRORS, serveInternalServerError } from './resp/error.js';
import { serializeUser } from './serializer/user.js';

export class AuthController {
	private service: UserService;
	private businessService: BusinessService;
	private s3Service: S3Service;
	private assetService: AssetService;
	private userRepository: UserRepository;

	constructor(
		userService: UserService,
		businessService: BusinessService,
		s3Service: S3Service,
		assetService: AssetService,
		userRepository: UserRepository,
	) {
		this.service = userService;
		this.businessService = businessService;
		this.s3Service = s3Service;
		this.assetService = assetService;
		this.userRepository = userRepository;
	}

	/**
	 * Authenticates a user with email and password
	 * @param {Context} c - The Hono context containing login credentials
	 * @returns {Promise<Response>} Response containing JWT token and user data
	 * @throws {Error} When authentication fails
	 */
	public login = async (c: Context) => {
		try {
			const body: LoginBody = await c.req.json();
			const user = await this.service.findByEmail(body.email);
			if (!user) {
				return c.json(
					{
						success: false,
						message: 'Invalid email, please try again',
						code: 'AUTH_INVALID_CREDENTIALS',
					},
					401,
				);
			}
			const isVerified = verify(body.password, user.password);
			if (!isVerified) {
				return c.json(
					{
						success: false,
						message: 'Invalid password, please try again',
						code: 'AUTH_INVALID_CREDENTIALS',
					},
					401,
				);
			}

			const token = await encode(user.id, user.email);
			const serializedUser = await serializeUser(user);
			return c.json({
				token,
				user: serializedUser,
			});
		} catch (err) {
			logger.error(err);
			return serveInternalServerError(c, err);
		}
	};

	/**
	 * Registers a new user in the system
	 * @param {Context} c - The Hono context containing registration data
	 * @returns {Promise<Response>} Response containing JWT token and user data
	 * @throws {Error} When registration fails or user already exists
	 */
	public coldRegister = async (c: Context) => {
		const body: RegistrationBody = await c.req.json();
		try {
			const { work_email } = body;
			const existingUser = await this.service.findByEmail(work_email);
			if (existingUser) {
				return c.json(
					{
						message: ERRORS.USER_EXISTS,
						code: 'USER_EXISTS',
					},
					400,
				);
			}

			//reject personal emails
			const rejectedEmails = [
				//'gmail.com',
				'yahoo.com',
				'hotmail.com',
				'outlook.com',
				'icloud.com',
				'aol.com',
				'yahoo.co.uk',
				'yahoo.com.au',
				'yahoo.com.br',
				'yahoo.com.es',
				'yahoo.com.fr',
				'yahoo.com.de',
				'yahoo.com.it',
				'yahoo.com.nl',
				'yahoo.com.pt',
				'yahoo.com.ru',
				'yahoo.com.tr',
				'yahoo.com.ua',
				'yahoo.com.vn',
			];
			if (rejectedEmails.includes(work_email.split('@')[1])) {
				return c.json(
					{
						message: 'We are not accepting personal emails at the moment',
						code: 'INVALID_EMAIL',
					},
					400,
				);
			}

			const randomPassword = generateSecurePassword(6);

			//6 digint random number
			const token = Math.floor(100000 + Math.random() * 900000).toString();
			const newUser: NewUser = {
				email: work_email,
				password: randomPassword,
				role: 'user',
				dial_code: '+1',
				phone: '1234567890',
				first_name: '',
				last_name: '',
				loan_urgency: 'none',
				email_token: token,
			};

			await this.service.create(newUser);

			const user = await this.service.findByEmail(work_email);
			if (!user) {
				return serveInternalServerError(c, new Error(ERRORS.USER_NOT_FOUND));
			}

			const link = `${env.FRONTEND_URL}${env.NODE_ENV === 'development' ? '/dev' : ''}/account-setup-finish-verification?token=${token}&email=${user.email}&id=${user.id}`;

			await sendTemplateEmail(user.email, `Dear User`, 'd-3f05d1f7f1604a06a2b9e072c42fec3a', {
				subject: 'Click the link to verify your email',
				title: 'Click the link to verify your email',
				subtitle: `Let's get you verified`,
				body: `Welcome to ${env.BRAND_NAME}. Let's get you verified. Click the link to verify your email: ${link}`,
				buttonText: 'Verify email',
				buttonLink: link,
			});

			return c.json({ message: 'User created successfully, please check your email for your verification code' });
		} catch (err) {
			return serveInternalServerError(c, err);
		}
	};

	/**
	 * Registers a new user in the system
	 * @param {Context} c - The Hono context containing registration data
	 * @returns {Promise<Response>} Response containing JWT token and user data
	 * @throws {Error} When registration fails or user already exists
	 */
	public claimYourAccount = async (c: Context) => {
		const body: ClaimYourAccountBody = await c.req.json();
		try {
			const { work_email, first_name, last_name, password, loan_urgency } = body;
			const existingUser = await this.service.findByEmail(work_email);
			if (!existingUser) {
				return c.json(
					{
						message: ERRORS.USER_EXISTS,
						code: 'USER_EXISTS',
					},
					400,
				);
			}

			//reject personal emails
			const rejectedEmails = [
				'gmail.com',
				'yahoo.com',
				'hotmail.com',
				'outlook.com',
				'icloud.com',
				'aol.com',
				'yahoo.co.uk',
				'yahoo.com.au',
				'yahoo.com.br',
				'yahoo.com.es',
				'yahoo.com.fr',
				'yahoo.com.de',
				'yahoo.com.it',
				'yahoo.com.nl',
				'yahoo.com.pt',
				'yahoo.com.ru',
				'yahoo.com.tr',
				'yahoo.com.ua',
				'yahoo.com.vn',
			];
			if (rejectedEmails.includes(work_email.split('@')[1])) {
				return c.json(
					{
						message: 'We are not accepting personal emails at the moment',
						code: 'INVALID_EMAIL',
					},
					400,
				);
			}

			await this.service.update(existingUser.id, { first_name, last_name, password, loan_urgency });

			const user = await this.service.findByEmail(work_email);
			if (!user) {
				return c.json(
					{
						message: ERRORS.USER_NOT_FOUND,
						code: 'USER_NOT_FOUND',
					},
					400,
				);
			}

			await sendTemplateEmail(user.email, user.first_name || 'Dear User', 'd-3f05d1f7f1604a06a2b9e072c42fec3a', {
				subject: 'Welcome to Assembled Brands',
				title: 'Welcome to Assembled Brands',
				subtitle: `Welcome to Assembled Brands`,
				name: user.first_name || 'Dear User',
				body: `Welcome to Assembled Brands. We have are glad to have you on board.`,
				buttonText: 'Ok, got it',
				buttonLink: `${env.FRONTEND_URL}`,
			});

			const token = await encode(user.id, user.email);
			const serializedUser = await serializeUser(user);
			return c.json({ token, user: serializedUser });
		} catch (err) {
			return serveInternalServerError(c, err);
		}
	};

	/**
	 * Sends a verification token to user's email, tp prevent spam registrations
	 * @param {Context} c - The Hono context containing email information
	 * @returns {Promise<Response>} Response indicating success or failure of token sending
	 * @throws {Error} When token generation or email sending fails
	 */
	public sendToken = async (c: Context) => {
		try {
			const body: EmailVerificationBody = await c.req.json();
			const user = await this.service.findByEmail(body.email);
			if (!user) {
				return c.json(
					{
						message: 'Invalid email, please check',
						code: 'AUTH_INVALID_CREDENTIALS',
					},
					401,
				);
			}

			//6 digint random number
			const token = Math.floor(100000 + Math.random() * 900000).toString();
			await this.userRepository.update(user.id, { email_token: token });

			await sendTemplateEmail(user.email, user.first_name || 'Dear User', 'd-3f05d1f7f1604a06a2b9e072c42fec3a', {
				subject: 'Your verification code',
				title: 'Your verification code',
				subtitle: `${token}`,
				name: user.first_name || 'Dear User',
				body: `Welcome to ${env.BRAND_NAME}. Your verification code code is ${token}`,
				buttonText: 'Ok, got it',
				buttonLink: `${env.FRONTEND_URL}`,
			});

			return c.json({
				message: 'Email token sent successfully',
			});
		} catch (err) {
			logger.error(err);
			return serveInternalServerError(c, err);
		}
	};

	/**
	 * Verifies the registration token sent to user's email
	 * @param {Context} c - The Hono context containing token and user ID
	 * @returns {Promise<Response>} Response indicating verification status
	 * @throws {Error} When token verification fails
	 */
	public verifyEmailAndSetPassword = async (c: Context) => {
		try {
			const body: VerifyEmailAndSetPasswordBody = await c.req.json();
			const user = await this.service.find(body.id);
			if (!user) {
				return c.json(
					{
						message: ERRORS.USER_NOT_FOUND,
						code: 'USER_NOT_FOUND',
					},
					400,
				);
			}
			if (user.email_token !== String(body.token)) {
				return c.json(
					{
						message: ERRORS.INVALID_TOKEN,
						code: 'INVALID_TOKEN',
					},
					400,
				);
			}

			//set password
			const hashedPassword = encrypt(body.password);
			await this.service.update(user.id, { password: hashedPassword, email_token: null, is_verified: true });

			//generate token and serialize user
			const token = await encode(user.id, user.email);
			const serializedUser = await serializeUser(user);

			//send template email to user
			await sendTemplateEmail(user.email, user.first_name || 'Dear User', env.TRANSACTIONAL_EMAIL_TEMPLATE_ID, {
				subject: 'Your account has been verified',
				title: 'Your account has been verified',
				subtitle: `Your account has been verified`,
				name: user.first_name || 'Dear User',
				body: `Your account has been verified. You can now login to your account.`,
			});
			return c.json({ token, user: serializedUser });
		} catch (err) {
			logger.error(err);
			return serveInternalServerError(c, err);
		}
	};

	/**
	 * Initiates password reset process by sending reset token
	 * @param {Context} c - The Hono context containing email information
	 * @returns {Promise<Response>} Response indicating reset link sent status
	 * @throws {Error} When reset token generation or email sending fails
	 */
	public startPasswordReset = async (c: Context) => {
		try {
			const body: RequestResetPasswordBody = await c.req.json();
			const user = await this.service.findByEmail(body.email);
			if (!user) {
				return c.json(
					{
						message: ERRORS.USER_NOT_FOUND,
						code: 'USER_NOT_FOUND',
					},
					400,
				);
			}
			const token = Math.floor(100000 + Math.random() * 900000).toString();
			await this.userRepository.update(user.id, { reset_token: token });
			await sendTemplateEmail(user.email, `${user.first_name || 'Dear User'}`, 'd-fd5ab39952154cf6a94b41e57ff87c43', {
				subject: 'Reset your password',
				title: 'Reset your password',
				subtitle: `${token}`,
				name: user.first_name || 'Dear User',
				body: `Please click this link to reset your password: ${env.FRONTEND_URL}/reset-password?token=${token}&email=${user.email}`,
				buttonText: 'Reset password now',
				buttonLink: `${env.FRONTEND_URL}${env.NODE_ENV === 'development' ? '/dev' : ''}/reset-password?token=${token}&email=${user.email}`,
			});
			return c.json({
				message: 'Reset password link sent successfully',
			});
		} catch (err) {
			logger.error(err);
			return serveInternalServerError(c, err);
		}
	};

	/**
	 * Retrieves user information from JWT payload
	 * @private
	 * @param {Context} c - The Hono context containing JWT payload
	 * @returns {Promise<User|null>} The user object if found, null otherwise
	 */
	private getUser = async (c: Context) => {
		const { email } = c.get('jwtPayload');
		const user = await this.service.findByEmail(email);
		return user;
	};

	/**
	 * Resets user's password using token sent via email
	 * @param {Context} c - The Hono context containing new password and token
	 * @returns {Promise<Response>} Response indicating password reset status
	 * @throws {Error} When password reset fails
	 */
	public resetPassword = async (c: Context) => {
		try {
			const body: ResetPasswordBody = await c.req.json();
			const user = await this.service.findByEmail(body.email);
			if (!user) {
				return c.json(
					{
						message: ERRORS.USER_NOT_FOUND,
						code: 'USER_NOT_FOUND',
					},
					400,
				);
			}
			if (user.reset_token !== String(body.token)) {
				return c.json(
					{
						message: ERRORS.INVALID_TOKEN,
						code: 'INVALID_TOKEN',
					},
					400,
				);
			}
			const hashedPassword = encrypt(body.password);
			await this.service.update(user.id, { password: hashedPassword, reset_token: null });

			await sendTemplateEmail(user.email, user.first_name || 'Dear User', env.TRANSACTIONAL_EMAIL_TEMPLATE_ID, {
				subject: 'Password reset',
				title: 'Password reset',
				subtitle: `Your password has been reset successfully`,
				body: `Your password has been reset successfully. If this was not you, please contact our support agents. Thanks again for using ${env.FRONTEND_URL}!`,
				buttonText: 'Ok, got it',
				buttonLink: `${env.FRONTEND_URL}`,
			});
			return c.json({
				message: 'Password reset successfully',
			});
		} catch (err) {
			logger.error(err);
			return serveInternalServerError(c, err);
		}
	};

	/**
	 * Retrieves current user's profile information
	 * @param {Context} c - The Hono context containing user information
	 * @returns {Promise<Response>} Response containing user profile data
	 * @throws {Error} When profile retrieval fails
	 */
	public me = async (c: Context) => {
		const payload: JWTPayload = c.get('jwtPayload');
		const user = await this.service.findByEmail(payload.email as string);
		if (!user) {
			return c.json(
				{
					message: ERRORS.USER_NOT_FOUND,
					code: 'USER_NOT_FOUND',
				},
				400,
			);
		}

		const serializedUser = await serializeUser(user);
		return c.json({ user: serializedUser });
	};

	/**
	 * Updates user's profile details
	 * @param {Context} c - The Hono context containing updated user information
	 * @returns {Promise<Response>} Response containing updated user data
	 * @throws {Error} When profile update fails
	 */
	public updateUserDetails = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return c.json(
					{
						message: ERRORS.USER_NOT_FOUND,
						code: 'USER_NOT_FOUND',
					},
					400,
				);
			}

			const body: UpdateUserDetailsBody = await c.req.json();

			// If email is being changed, check if it's already taken
			if (body.email && body.email !== user.email) {
				const existingUser = await this.service.findByEmail(body.email);
				if (existingUser) {
					return c.json(
						{
							message: ERRORS.USER_EXISTS,
							code: 'USER_EXISTS',
						},
						400,
					);
				}
			}

			const { first_name, last_name, email, dial_code, phone } = body;

			// Update user details
			await this.service.update(user.id, { first_name, last_name, email, dial_code, phone });

			// Get updated user
			const updatedUser = await this.service.find(user.id);
			if (!updatedUser) {
				return c.json(
					{
						message: ERRORS.USER_NOT_FOUND,
						code: 'USER_NOT_FOUND',
					},
					400,
				);
			}

			const serializedUser = await serializeUser(updatedUser);
			return c.json({
				message: 'User details updated successfully',
				user: serializedUser,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/*public uploadProfileImage = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}
			const body: UploadProfileImageBody = await c.req.json();
			const { imageBase64, fileName } = body;
			if (!imageBase64 || !fileName) {
				return serveBadRequest(c, ERRORS.INVALID_REQUEST);
			}

			// Convert base64 to buffer
			const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
			const buffer = Buffer.from(base64Data, 'base64');

			// Create asset using AssetService
			const { asset: assetId } = await this.assetService.createAsset(
				user.id,
				fileName.replace(/[^\w.-]/g, ''),
				getContentType(imageBase64),
				'profile_picture',
				buffer.length,
				0,
				buffer,
			);

			// Get the full asset object to access the URL
			const asset = await this.assetService.getAsset(assetId);
			if (!asset || !asset.asset_url) {
				return serveInternalServerError(c, new Error('Failed to get asset URL'));
			}

			// Update user profile image with the asset URL
			await this.service.updateProfileImage(user.id, asset.asset_url);
			return c.json({
				
				message: 'Profile image updated successfully',
				asset: asset,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};*/
}
