import type { Context } from 'hono';

import { logger } from '../../lib/logger.ts';
import type { AssetService } from '../../service/asset.js';
import { EmailService } from '../../service/email.ts';
import { NotificationService } from '../../service/notification.js';
import type { UserService } from '../../service/user.js';
import type {
	AssetQuery,
	CompleteMultipartUploadBody,
	CreateAssetBody,
	CreateMultipartAssetBody,
	MediaConvertWebhookPayload,
	RenameAssetBody,
} from '../validator/asset.js';
import { ERRORS, serveBadRequest, serveInternalServerError, serveNotFound } from './resp/error.js';
import { serveData } from './resp/resp.ts';

export class AssetController {
	private service: AssetService;
	private userService: UserService;
	private emailService: EmailService;
	private notificationService: NotificationService;
	constructor(service: AssetService, userService: UserService, emailService: EmailService, notificationService: NotificationService) {
		this.service = service;
		this.userService = userService;
		this.emailService = emailService;
		this.notificationService = notificationService;
	}

	/**
	 * Retrieves user information from JWT payload
	 * @private
	 * @param {Context} c - The Hono context containing JWT payload
	 * @returns {Promise<User|null>} The user object if found, null otherwise
	 */
	private async getUser(c: Context) {
		const { email } = c.get('jwtPayload');
		const user = await this.userService.findByEmail(email);
		return user;
	}

	/**
	 * Creates a new asset in the system
	 * @param {Context} c - The Hono context containing asset details
	 * @returns {Promise<Response>} Response containing created asset information
	 * @throws {Error} When asset creation fails
	 */
	public createAsset = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const body: CreateAssetBody = await c.req.json();
			const { fileName, contentType, assetType, fileSize, duration } = body;

			const result = await this.service.createAsset(user.id, fileName.replace(/[^\w.-]/g, ''), contentType, assetType, fileSize, duration);
			//get the asset from the database
			const asset = await this.service.getAsset(result.asset);
			return c.json({ ...result, asset }, 201);
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Retrieves all assets based on user role and permissions
	 * @param {Context} c - The Hono context containing pagination, search, and filter parameters
	 * @returns {Promise<Response>} Response containing list of assets
	 * @throws {Error} When fetching assets fails
	 */
	public getAssets = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const { page, limit, search, asset_type } = c.req.query();
			const query: AssetQuery = {
				page: page ? Number.parseInt(page) : 1,
				limit: limit ? Number.parseInt(limit) : 30,
				search,
				asset_type: asset_type as AssetQuery['asset_type'],
			};

			if (user.role === 'admin' || user.role === 'super-admin') {
				const assets = await this.service.getAllAssets(user.id, query);
				return c.json(assets);
			}

			// Get hostId from context and if hostId exists (team access), get resources for that host
			const hostId = c.get('hostId');
			if (hostId) {
				const assets = await this.service.getAssetsByUser(hostId, query);
				return c.json(assets);
			}

			// Regular users only see their own resources
			const assets = await this.service.getAssetsByUser(user.id, query);
			return c.json(assets);
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Handles HLS conversion webhook
	 * @param {Context} c - The Hono context containing webhook body
	 * @returns {Promise<Response>} Response indicating webhook processing status
	 * @throws {Error} When webhook processing fails
	 */
	public handleHlsConversionWebhook = async (c: Context) => {
		try {
			const body = (await c.req.json()) as MediaConvertWebhookPayload;

			if (body.detail.status === 'COMPLETE') {
				// Handle completed job
				logger.info({
					event: 'MediaConvert job completed',
					jobId: body.detail.jobId,
					outputGroupDetails: body.detail.outputGroupDetails,
				});

				// Find the asset associated with this MediaConvert job
				const asset = await this.service.findAssetByMediaConvertJobId(body.detail.jobId);

				if (!asset) {
					logger.warn(body.detail.jobId);
					return serveData(c, {
						message: 'HLS conversion completed but no asset found',
						jobId: body.detail.jobId,
					});
				}

				// Extract HLS URL from outputGroupDetails
				const outputFilePath = body.detail?.outputGroupDetails?.[0]?.outputDetails?.[0]?.outputFilePaths?.[0];

				if (outputFilePath) {
					// Update the asset with the HLS URL
					await this.service.updateAssetProcessingStatus(asset.id, {
						mediaconvert_job_status: 'completed',
						mediaconvert_job_progress: 100,
						mediaconvert_job_current_phase: 'completed',
						processing_status: 'completed',
						hls_url: outputFilePath,
					});

					logger.info({
						assetId: asset.id,
						hlsUrl: outputFilePath,
					});
					//send email to host
					const host = await this.userService.find(asset.user_id);
					if (host) {
						const [email, notification] = await Promise.all([
							this.emailService.createEmail({
								host_id: host.id,
								email: host.email,
								subject: 'Optimizion of your video is completed!',
								title: 'Your video is ready for streaming!',
								subtitle: `All good, your video is now optimized.`,
								body: `Great news! Your video ${asset.asset_name} has finished processing and is now available in HLS format. 
    This means faster playback, better quality, and seamless streaming across all devices.
    You can now use it in your events with confidence.
  `,
								button_text: 'View Your Video',
								button_link: `${process.env.FRONTEND_URL}`,
							}),

							this.notificationService.create({
								user_id: asset.user_id,
								notification_type: 'system',
								link: `/concept/file-manager`,
								metadata: {
									asset_id: asset.id,
									asset_name: asset.asset_name,
								},
								title: `Video processing completed`,
								message: `Your video has finished processing and is now available for event viewers.`,
							}),
						]);
						return serveData(c, {
							message: 'HLS conversion completed successfully',
							assetId: asset.id,
							outputFilePath: outputFilePath,
							email,
							notification,
						});
					}
				} else {
					logger.warn('No output file path found in MediaConvert response');
				}

				return serveData(c, {
					message: 'HLS conversion completed successfully',
					assetId: asset.id,
					outputFilePath: outputFilePath,
				});
			}

			if (body.detail.status === 'STATUS_UPDATE') {
				// Handle status update
				const { jobProgress } = body.detail;
				logger.info({
					event: 'MediaConvert job status update',
					jobId: body.detail.jobId,
					currentPhase: jobProgress?.currentPhase,
					jobPercentComplete: jobProgress?.jobPercentComplete,
					phaseProgress: jobProgress?.phaseProgress,
				});

				// Find the asset and update processing status if needed
				const asset = await this.service.findAssetByMediaConvertJobId(body.detail.jobId);
				if (asset) {
					// Keep the asset in 'processing' status during updates
					await this.service.updateAssetProcessingStatus(asset.id, {
						mediaconvert_job_status: 'processing',
						mediaconvert_job_progress: jobProgress?.jobPercentComplete,
						mediaconvert_job_current_phase: jobProgress?.currentPhase,
					});
				}

				return serveData(c, {
					message: 'HLS conversion status update received',
					jobId: body.detail.jobId,
					progress: jobProgress?.jobPercentComplete,
					currentPhase: jobProgress?.currentPhase,
				});
			}

			if (body.detail.status === 'PROGRESSING') {
				// Handle progressing job
				const { jobProgress } = body.detail;
				logger.info({
					event: 'MediaConvert job progressing',
					jobId: body.detail.jobId,
					currentPhase: jobProgress?.currentPhase,
					jobPercentComplete: jobProgress?.jobPercentComplete,
					phaseProgress: jobProgress?.phaseProgress,
				});

				// Find the asset and update processing status
				const asset = await this.service.findAssetByMediaConvertJobId(body.detail.jobId);
				if (asset) {
					// Update the asset with progressing status
					await this.service.updateAssetProcessingStatus(asset.id, {
						mediaconvert_job_progress: jobProgress?.jobPercentComplete,
						mediaconvert_job_current_phase: jobProgress?.currentPhase,
						processing_status: 'processing',
					});
				}

				return serveData(c, {
					message: 'HLS conversion progressing',
					jobId: body.detail.jobId,
					progress: jobProgress?.jobPercentComplete,
					currentPhase: jobProgress?.currentPhase,
				});
			}

			if (body.detail.status === 'ERROR') {
				// Handle completed job
				logger.info({
					event: 'MediaConvert job failed',
					jobId: body.detail.jobId,
				});

				// Find the asset associated with this MediaConvert job
				const asset = await this.service.findAssetByMediaConvertJobId(body.detail.jobId);

				if (!asset) {
					logger.warn(`No asset found for MediaConvert job ID: ${body.detail.jobId}`);
					return serveData(c, {
						message: 'HLS conversion failed',
						jobId: body.detail.jobId,
					});
				}

				// Extract HLS URL from outputGroupDetails
				const outputFilePath = body.detail?.outputGroupDetails?.[0]?.outputDetails?.[0]?.outputFilePaths?.[0];

				//send email to host
				const host = await this.userService.find(asset.user_id);
				if (host) {
					const [email, notification] = await Promise.allSettled([
						this.emailService.createEmail({
							host_id: host.id,
							email: host.email,
							subject: 'Optimizion of your video is failed!',
							title: 'Your video is not optimized!',
							subtitle: ` Your video failed to process.`,
							body: `Unfortunately, we were unable to optimize your video "${asset.asset_name}". This means the file could not be processed for smooth playback and may not work properly for your event viewers.
  This can happen due to a number of reasons, such as an unsupported format, a corrupted file, or a temporary system error. To resolve this, we recommend deleting the current video from your event and uploading a new version.
  Once you've uploaded a new video, our system will automatically attempt to process and optimize it again.
  We apologize for the inconvenience and appreciate your patience.
`,
							button_text: 'Try Again',
							button_link: `${process.env.FRONTEND_URL}`,
						}),
						this.notificationService.create({
							user_id: asset.user_id,
							notification_type: 'system',
							link: `/concept/file-manager`,
							metadata: {
								asset_id: asset.id,
								asset_name: asset.asset_name,
							},
							title: `Video processing failed`,
							message: `Your video failed to process. Please delete the asset and upload a new one.`,
						}),
					]);
					return serveData(c, {
						message: 'HLS conversion failed',
						assetId: asset.id,
						email,
						notification,
						outputFilePath: outputFilePath,
					});
				}

				return serveData(c, {
					message: 'HLS conversion failed',
					assetId: asset.id,
					outputFilePath: outputFilePath,
				});
			}

			return serveData(c, {
				message: 'HLS conversion webhook received',
				body: body,
			});
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Retrieves detailed information about a specific asset
	 * @param {Context} c - The Hono context containing asset ID
	 * @returns {Promise<Response>} Response containing asset details
	 * @throws {Error} When fetching asset details fails
	 */
	public getAsset = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const assetId = Number(c.req.param('id'));
			const asset = await this.service.getAsset(assetId);

			if (!asset) {
				return serveNotFound(c, ERRORS.ASSET_NOT_FOUND);
			}

			return c.json(asset);
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Deletes an asset if not linked to active events with leads
	 * @param {Context} c - The Hono context containing asset ID
	 * @returns {Promise<Response>} Response indicating deletion status
	 * @throws {Error} When asset deletion fails
	 */
	public deleteAsset = async (c: Context) => {
		try {
			const assetId = Number(c.req.param('id'));
			const asset = await this.service.getAsset(assetId);

			if (!asset) {
				return serveNotFound(c, ERRORS.ASSET_NOT_FOUND);
			}

			await this.service.deleteAsset(assetId);
			return serveData(c, { message: 'Asset deleted successfully' });
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Renames an existing asset while preserving file extension
	 * @param {Context} c - The Hono context containing new asset name
	 * @returns {Promise<Response>} Response indicating rename status
	 * @throws {Error} When asset rename fails
	 */
	public renameAsset = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}

			const assetId = Number(c.req.param('id'));
			const asset = await this.service.getAsset(assetId);
			if (!asset) {
				return serveNotFound(c, ERRORS.ASSET_NOT_FOUND);
			}
			//only and master role or admin or the owner of the  can update the asset
			if (user.role !== 'admin' && user.role !== 'super-admin' && asset.user_id !== user.id) {
				return serveBadRequest(c, ERRORS.NOT_ALLOWED);
			}

			const body: RenameAssetBody = await c.req.json();
			const { fileName } = body;
			if (!fileName) {
				return serveBadRequest(c, ERRORS.FILE_NAME_REQUIRED);
			}
			const originalExt = asset.asset_name.split('.').pop()?.toLowerCase();
			const newExt = fileName.split('.').pop()?.toLowerCase();

			if (originalExt !== newExt) {
				return serveBadRequest(c, `New file name must have the same extension: .${originalExt}`);
			}

			await this.service.renameAsset(assetId, fileName);
			return c.json({ message: 'Asset renamed successfully' });
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Creates a new asset using multipart upload
	 */
	public createMultipartAsset = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}
			const body: CreateMultipartAssetBody = await c.req.json();
			const { fileName, contentType, assetType, fileSize, duration, partSize } = body;

			const result = await this.service.createMultipartAsset(user.id, fileName, contentType, assetType, fileSize, duration, partSize);

			return c.json(result);
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};

	/**
	 * Completes a multipart upload
	 */
	public completeMultipartUpload = async (c: Context) => {
		try {
			const user = await this.getUser(c);
			if (!user) {
				return serveBadRequest(c, ERRORS.USER_NOT_FOUND);
			}
			const assetId = Number(c.req.param('id'));
			if (!assetId) {
				return serveBadRequest(c, ERRORS.ASSET_ID_NOT_FOUND);
			}
			const body: CompleteMultipartUploadBody = await c.req.json();
			const { parts } = body;

			await this.service.completeMultipartUpload(assetId, parts);

			// Get the asset to check if it's a video that needs HLS conversion
			const asset = await this.service.getAsset(assetId);

			return c.json({ success: true, asset });
		} catch (error) {
			logger.error(error);
			return serveInternalServerError(c, error);
		}
	};
}
