import type { Context } from 'hono';
import { env } from 'process';

import { sendTransactionalEmail } from '../../lib/email-processor.ts';
import { encrypt, verify } from '../../lib/encryption.js';
import { encode, type JWTPayload } from '../../lib/jwt.ts';
import { logger } from '../../lib/logger.ts';
import type { UserRepository } from '../../repository/user.js';
import type { AssetService } from '../../service/asset.js';
import type { BusinessService } from '../../service/business.js';
import type { S3Service } from '../../service/s3.js';
import type { UserService } from '../../service/user.js';
import { generateSecurePassword, getContentType } from '../../util/string.ts';
import type {
	ClaimYourAccountBody,
	EmailVerificationBody,
	LoginBody,
	RegisterTokenBody,
	RegistrationBody,
	RequestResetPasswordBody,
	ResetPasswordBody,
	UpdateUserDetailsBody,
} from '../validator/user.js';
import { ERRORS, MAIL_CONTENT, serveBadRequest, serveInternalServerError } from './resp/error.js';
import { serveData } from './resp/resp.js';
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
			return serveData(c, { token, user: serializedUser });
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
	public register = async (c: Context) => {
		const body: RegistrationBody = await c.req.json();
		try {
			const { work_email } = body;
			const existingUser = await this.service.findByEmail(work_email);
			if (existingUser) {
				return serveBadRequest(c, ERRORS.USER_EXISTS);
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
				return serveBadRequest(c, 'We are not accepting personal emails at the moment');
			}

			const randomPassword = generateSecurePassword(6);
			await this.service.create(work_email, randomPassword, 'user', '+1', '1234567890', '', '', 'none');

			const user = await this.service.findByEmail(work_email);
			if (!user) {
				return serveInternalServerError(c, new Error(ERRORS.USER_NOT_FOUND));
			}

			await sendTransactionalEmail(user.email, `${user.first_name} ${user.last_name}`, 12, {
				subject: 'Welcome to Assembled Brands',
				title: 'Welcome to Assembled Brands',
				subtitle: `Welcome to Assembled Brands`,
				body: `Welcome to Assembled Brands. We have are glad to have you on board.`,
				buttonText: 'Ok, got it',
				buttonLink: `${env.FRONTEND_URL}`,
			});

			const token = await encode(user.id, user.email);
			const serializedUser = await serializeUser(user);
			return serveData(c, { token, user: serializedUser });
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
				return serveBadRequest(c, ERRORS.USER_EXISTS);
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
				return serveBadRequest(c, 'We are not accepting personal emails at the moment');
			}

			await this.service.update(existingUser.id, { first_name, last_name, password, loan_urgency });

			const user = await this.service.findByEmail(work_email);
			if (!user) {
				return serveInternalServerError(c, new Error(ERRORS.USER_NOT_FOUND));
			}

			await sendTransactionalEmail(user.email, `${user.first_name} ${user.last_name}`, 12, {
				subject: 'Welcome to Assembled Brands',
				title: 'Welcome to Assembled Brands',
				subtitle: `Welcome to Assembled Brands`,
				body: `Welcome to Assembled Brands. We have are glad to have you on board.`,
				buttonText: 'Ok, got it',
				buttonLink: `${env.FRONTEND_URL}`,
			});

			const token = await encode(user.id, user.email);
			const serializedUser = await serializeUser(user);
			return serveData(c, { token, user: serializedUser });
		} catch (err) {
			return serveInternalServerError(c, err);
		}
	};

	/**
	 * Sends a verification token to user's email
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
						success: false,
						message: 'Invalid email, please check',
						code: 'AUTH_INVALID_CREDENTIALS',
					},
					401,
				);
			}
			//6 digint random number
			const token = Math.floor(100000 + Math.random() * 900000).toString();
			await this.userRepository.update(user.id, { email_token: token });

			await sendTransactionalEmail(user.email, `${user.first_name} ${user.last_name}`, 12, {
				subject: 'Your code',
				title: 'Thanks for signing up',
				subtitle: `${token}`,
				body: `Welcome to ${env.BRAND_NAME}. Your verification code code is ${token}`,
				buttonText: 'Ok, got it',
				buttonLink: `${env.FRONTEND_URL}`,
			});

			return serveData(c, {
				success: true,
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
	public verifyRegistrationToken = async (c: Context) => {
		try {
			const body: RegisterTokenBody = await c.req.json();
			const user = await this.service.find(body.id);
			if (!user) {
				return c.json(
					{
						success: false,
						message: 'Ops, could not verify account, please check',
						code: 'AUTH_INVALID_CREDENTIALS',
					},
					401,
				);
			}
			if (user.email_token !== String(body.token)) {
				return c.json(
					{
						success: false,
						message: 'Ops, wrong code, please check',
						code: 'AUTH_INVALID_CREDENTIALS',
					},
					401,
				);
			}
			await this.service.update(user.id, { is_verified: true });
			return serveData(c, {
				success: true,
				message: 'Email verified successfully',
			});
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
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}
			const token = Math.floor(100000 + Math.random() * 900000).toString();
			await this.userRepository.update(user.id, { reset_token: token });
			await sendTransactionalEmail(user.email, `${user.first_name} ${user.last_name}`, 12, {
				subject: 'Reset password',
				title: 'Reset password',
				subtitle: `${token}`,
				body: `Please click this link to reset your password: ${env.FRONTEND_URL}/reset-password?token=${token}&email=${user.email}`,
				buttonText: 'Reset password',
				buttonLink: `${env.FRONTEND_URL}/reset-password?token=${token}&email=${user.email}`,
			});
			return serveData(c, {
				success: true,
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
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}
			if (user.reset_token !== String(body.token)) {
				return serveBadRequest(c, ERRORS.INVALID_TOKEN);
			}
			const hashedPassword = encrypt(body.password);
			await this.service.update(user.id, { password: hashedPassword });
			await this.userRepository.update(user.id, { reset_token: null });
			await sendTransactionalEmail(user.email, `${user.first_name} ${user.last_name}`, 12, {
				subject: 'Password reset',
				title: 'Password reset',
				subtitle: `Your password has been reset successfully`,
				body: `Your password has been reset successfully. If this was not you, please contact our support agents. Thanks again for using ${env.FRONTEND_URL}!`,
				buttonText: 'Ok, got it',
				buttonLink: `${env.FRONTEND_URL}`,
			});
			return serveData(c, {
				success: true,
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
			return serveInternalServerError(c, new Error(ERRORS.USER_NOT_FOUND));
		}

		const serializedUser = await serializeUser(user);
		return serveData(c, { user: serializedUser });
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
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const body: UpdateUserDetailsBody = await c.req.json();

			// If email is being changed, check if it's already taken
			if (body.email && body.email !== user.email) {
				const existingUser = await this.service.findByEmail(body.email);
				if (existingUser) {
					return serveBadRequest(c, ERRORS.USER_EXISTS);
				}
			}

			const { first_name, last_name, email, dial_code, phone } = body;

			// Update user details
			await this.service.update(user.id, { first_name, last_name, email, dial_code, phone });

			// Get updated user
			const updatedUser = await this.service.find(user.id);
			if (!updatedUser) {
				return serveInternalServerError(c, new Error(ERRORS.USER_NOT_FOUND));
			}

			const serializedUser = await serializeUser(updatedUser);
			return serveData(c, {
				success: true,
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
			return serveData(c, {
				success: true,
				message: 'Profile image updated successfully',
				asset: asset,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};*/
}
