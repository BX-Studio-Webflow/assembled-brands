import { eq, like } from 'drizzle-orm';

import type { AssetRepository } from '../repository/asset.js';
import type { Asset, NewAsset } from '../schema/schema.js';
import { assetsSchema } from '../schema/schema.js';
import { generateAssetKey, getKeyFromUrl } from '../util/string.ts';
import type { AssetQuery } from '../web/validator/asset.js';
import type { S3Service } from './s3.js';

/**
 * Service class for managing digital assets (images, videos, audio, documents)
 */
export class AssetService {
	private repository: AssetRepository;
	private s3Service: S3Service;

	constructor(repository: AssetRepository, s3Service: S3Service) {
		this.repository = repository;
		this.s3Service = s3Service;
	}

	/**
	 * Creates a new asset and uploads it to S3 if buffer is provided
	 * @param {number} userId - ID of the user creating the asset
	 * @param {string} fileName - Name of the file
	 * @param {string} contentType - MIME type of the file
	 * @param {'image'|'video'|'audio'|'document'|'profile_picture'} assetType - Type of asset
	 * @param {number} fileSize - Size of the file in bytes
	 * @param {number} duration - Duration in seconds (for audio/video)
	 * @param {Buffer} [buffer] - Optional file buffer for direct upload
	 * @returns {Promise<{presignedUrl: string, asset: Asset}>} Created asset and upload URL
	 */
	async createAsset(
		userId: number,
		fileName: string,
		contentType: string,
		assetType: 'image' | 'video' | 'audio' | 'document' | 'profile_picture',
		fileSize: number,
		duration: number,
		buffer?: Buffer,
	) {
		// Generate a unique key for the file with consistent folder structure
		const key = generateAssetKey(fileName, assetType);

		let url: string;
		let presignedUrl: string;
		if (buffer) {
			// If buffer is provided, upload the file
			url = await this.s3Service.uploadFile(key, buffer, contentType);
			presignedUrl = url;
		} else {
			// Otherwise, just generate a presigned URL for client upload
			const result = await this.s3Service.generatePresignedUrl(key, contentType);
			url = result.url; // Store the permanent URL in the database
			presignedUrl = result.presignedUrl;
		}

		// Create asset record in database
		const asset: NewAsset = {
			asset_name: fileName.replace(/[^\w.-]/g, ''),
			asset_size: String(fileSize),
			asset_type: assetType,
			content_type: contentType,
			asset_url: url,
			user_id: userId,
			duration: duration,
		};

		const createdAsset = await this.repository.create(asset);

		return {
			presignedUrl,
			asset: createdAsset,
		};
	}

	/**
	 * Retrieves all assets for a specific user with presigned URLs
	 * @param {number} userId - ID of the user
	 * @param {AssetQuery} [query] - Query parameters for filtering assets
	 * @returns {Promise<{assets: Asset[], total: number}>} List of assets and total count
	 */
	async getAssetsByUser(userId: number, query?: AssetQuery) {
		const { assets, total } = await this.repository.findByUserId(userId, query);

		// Add presigned URLs to all assets
		const assetsWithUrls = await Promise.all(
			assets.map(async (asset) => {
				if (!asset.asset_url) return asset;

				const presignedUrl = await this.s3Service.generateGetUrl(getKeyFromUrl(asset.asset_url), this.getContentType(asset), 86400);

				return {
					...asset,
					presignedUrl,
				};
			}),
		);

		return { assets: assetsWithUrls, total };
	}

	/**
	 * Retrieves a single asset by ID with presigned URL
	 * @param {number} id - ID of the asset
	 * @returns {Promise<Asset|undefined>} Asset if found, undefined otherwise
	 */
	async getAsset(id: number) {
		const asset = await this.repository.find(id);
		if (!asset || !asset.asset_url) return undefined;

		const presignedUrl = await this.s3Service.generateGetUrl(getKeyFromUrl(asset.asset_url), this.getContentType(asset), 86400);

		return {
			...asset,
			presignedUrl,
		};
	}

	/**
	 * Deletes an asset from both S3 and database
	 * @param {number} id - ID of the asset to delete
	 * @returns {Promise<void>}
	 */
	async deleteAsset(id: number) {
		const asset = await this.repository.find(id);
		if (!asset || !asset.asset_url) return;

		// Delete from S3 first
		await this.s3Service.deleteObject(getKeyFromUrl(asset.asset_url));

		// Then delete from database
		await this.repository.delete(id);
	}

	/**
	 * Renames an existing asset
	 * @param {number} id - ID of the asset
	 * @param {string} newFileName - New name for the asset
	 * @returns {Promise<void>}
	 */
	async renameAsset(id: number, newFileName: string) {
		const asset = await this.repository.find(id);
		if (!asset) return;

		// Update database
		await this.repository.update(id, {
			asset_name: newFileName,
		});
	}

	/**
	 * Updates asset properties
	 * @param {number} id - ID of the asset
	 * @param {Partial<Asset>} update - Properties to update
	 * @returns {Promise<void>}
	 */
	async updateAsset(id: number, update: Partial<Asset>) {
		await this.repository.update(id, update);
	}

	/**
	 * Finds all unprocessed video assets
	 * @returns {Promise<Asset[]>} List of unprocessed video assets
	 */
	async findUnprocessedVideos() {
		const { assets } = await this.repository.findByQuery({
			asset_type: 'video',
			processing_status: 'pending',
		});

		return assets.filter((asset) => asset.asset_url); // Only return assets that have been uploaded
	}

	/**
	 * Retrieves all assets with pagination and filtering
	 * @param {AssetQuery} [query] - Query parameters for filtering assets
	 * @returns {Promise<{assets: Asset[], total: number}>} List of assets and total count
	 */
	async getAllAssets(userId: number, query?: AssetQuery) {
		const { search, asset_type } = query || {};

		const whereConditions = [];
		if (search) {
			whereConditions.push(like(assetsSchema.asset_name, `%${search}%`));
		}
		if (asset_type) {
			whereConditions.push(eq(assetsSchema.asset_type, asset_type));
		}

		const { assets, total } = await this.repository.findByUserId(userId, query);

		// Add presigned URLs to all assets
		const assetsWithUrls = await Promise.all(
			assets.map(async (asset: Asset) => {
				if (!asset.asset_url) return asset;

				const presignedUrl = await this.s3Service.generateGetUrl(getKeyFromUrl(asset.asset_url), this.getContentType(asset), 86400);

				return {
					...asset,
					presignedUrl,
				};
			}),
		);

		return { assets: assetsWithUrls, total: total };
	}

	/**
	 * Determines content type for an asset
	 * @private
	 * @param {Asset} asset - The asset to determine content type for
	 * @returns {string} The content type
	 */
	private getContentType(asset: Asset): string {
		if (asset.content_type) {
			return asset.content_type;
		}

		// Fallback to determining from asset type if content_type is not stored
		switch (asset.asset_type) {
			case 'image':
				return 'image/jpeg';
			case 'video':
				return 'video/mp4';
			case 'audio':
				return 'audio/mpeg';
			case 'document':
				return 'application/pdf';
			default:
				return 'application/octet-stream';
		}
	}

	/**
	 * Creates a new asset using multipart upload to S3
	 * @param {number} userId - ID of the user creating the asset
	 * @param {string} fileName - Name of the file
	 * @param {string} contentType - MIME type of the file
	 * @param {'image'|'video'|'audio'|'document'|'profile_picture'} assetType - Type of asset
	 * @param {number} fileSize - Size of the file in bytes
	 * @param {number} duration - Duration in seconds (for audio/video)
	 * @param {number} partSize - Size of each part in bytes (default: 5MB)
	 * @returns {Promise<{uploadId: string, key: string, presignedUrls: string[], asset: Asset}>} Upload details and created asset
	 */
	async createMultipartAsset(
		userId: number,
		fileName: string,
		contentType: string,
		assetType: 'image' | 'video' | 'audio' | 'document' | 'profile_picture',
		fileSize: number,
		duration: number,
		partSize: number = 5 * 1024 * 1024, // 5MB default part size
	) {
		// Generate a unique key for the file with consistent folder structure
		const key = generateAssetKey(fileName, assetType);

		// Calculate number of parts needed
		const numParts = Math.ceil(fileSize / partSize);

		// Initiate multipart upload
		const { uploadId, url } = await this.s3Service.initiateMultipartUpload(key, contentType);

		// Generate presigned URLs for each part
		const presignedUrls = await Promise.all(
			Array.from({ length: numParts }, (_, i) => this.s3Service.generateMultipartPresignedUrl(key, uploadId, i + 1)),
		);

		// Create asset record in database
		const asset: NewAsset = {
			asset_name: fileName.replace(/[^\w.-]/g, ''),
			asset_size: String(fileSize),
			asset_type: assetType,
			content_type: contentType,
			asset_url: url,
			user_id: userId,
			duration: duration,
			upload_id: uploadId, // Store uploadId for later completion
			upload_status: 'pending',
		};

		const createdAsset = await this.repository.create(asset);

		return {
			uploadId,
			key,
			presignedUrls,
			asset: createdAsset,
		};
	}

	/**
	 * Completes a multipart upload after all parts have been uploaded
	 * @param {number} assetId - ID of the asset
	 * @param {Array<{ETag: string, PartNumber: number}>} parts - Array of uploaded parts with their ETags
	 * @returns {Promise<void>}
	 */
	async completeMultipartUpload(assetId: number, parts: Array<{ ETag: string; PartNumber: number }>) {
		const asset = await this.repository.find(assetId);
		if (!asset || !asset.upload_id || !asset.asset_url) {
			throw new Error('Asset not found or not a multipart upload');
		}

		const key = getKeyFromUrl(asset.asset_url);

		// Complete the multipart upload
		await this.s3Service.completeMultipartUpload(key, asset.upload_id, parts);

		// Update asset status
		await this.repository.update(assetId, {
			upload_status: 'completed',
		});
	}

	/**
	 * Aborts a multipart upload
	 * @param {number} assetId - ID of the asset
	 * @returns {Promise<void>}
	 */
	async abortMultipartUpload(assetId: number) {
		const asset = await this.repository.find(assetId);
		if (!asset || !asset.upload_id || !asset.asset_url) {
			throw new Error('Asset not found or not a multipart upload');
		}

		const key = getKeyFromUrl(asset.asset_url);

		// Abort the multipart upload
		await this.s3Service.abortMultipartUpload(key, asset.upload_id);

		// Delete the asset record
		await this.repository.delete(assetId);
	}

	/**
	 * Associates a MediaConvert job ID with an asset
	 * @param {number} assetId - ID of the asset
	 * @param {string} jobId - MediaConvert job ID
	 * @returns {Promise<void>}
	 */
	async associateMediaConvertJob(assetId: number, jobId: string): Promise<void> {
		await this.repository.update(assetId, {
			mediaconvert_job_id: jobId,
			processing_status: 'processing',
		});
	}

	/**
	 * Finds an asset by MediaConvert job ID
	 * @param {string} jobId - MediaConvert job ID
	 * @returns {Promise<Asset|undefined>} Asset if found, undefined otherwise
	 */
	async findAssetByMediaConvertJobId(jobId: string): Promise<Asset | undefined> {
		return await this.repository.findByMediaConvertJobId(jobId);
	}

	/**
	 * Updates asset processing status
	 * @param {number} assetId - ID of the asset
	 * @param {Partial<Asset>} data - Processing status
	 * @returns {Promise<void>}
	 */
	async updateAssetProcessingStatus(assetId: number, data: Partial<Asset>): Promise<void> {
		await this.repository.updateProcessingStatus(assetId, data);
	}

	/**
	 * Starts HLS conversion for a video asset
	 * @param {number} assetId - ID of the asset to convert
	 * @param {string} [roleArn] - IAM role ARN for MediaConvert (optional)
	 * @param {string} [jobTemplate] - Job template name (optional)
	 * @returns {Promise<{jobId: string, status: string}>} MediaConvert job ID and status
	 */
	async startHlsConversion(assetId: number, roleArn?: string, jobTemplate?: string): Promise<{ jobId: string; status: string }> {
		// Get the asset
		const asset = await this.repository.find(assetId);
		if (!asset) {
			throw new Error('Asset not found');
		}

		if (asset.asset_type !== 'video') {
			throw new Error('Only video assets can be converted to HLS');
		}

		if (!asset.asset_url) {
			throw new Error('Asset has no URL to convert');
		}

		// Extract the S3 key from the asset URL
		const key = getKeyFromUrl(asset.asset_url);

		// Create MediaConvert job
		const { jobId, status } = await this.s3Service.createMediaConvertJob(key, roleArn, jobTemplate);

		// Associate the job with the asset
		await this.associateMediaConvertJob(assetId, jobId);

		return { jobId, status };
	}
}
