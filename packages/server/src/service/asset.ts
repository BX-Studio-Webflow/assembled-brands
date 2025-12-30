import { eq, like } from 'drizzle-orm';

import type { AssetRepository } from '../repository/asset.js';
import type { Asset, NewAsset } from '../schema/schema.js';
import { assetsSchema } from '../schema/schema.js';
import { createGoogleJWT, generateAssetKey, getKeyFromUrl, normalizeFolderName } from '../util/string.ts';
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
	 * Retrieves an array of assets without presigned URL
	 * @param {number} id - ID of the asset
	 * @returns {Promise<Asset[]>} Assets
	 */
	async getAssetsWithoutPresignedUrl(ids: number[]) {
		return await this.repository.findAssets(ids);
	}

	/**
	 * Retrieves an array of assets without presigned URL
	 * @param {number} id - ID of the asset
	 * @returns {Promise<Asset[]>} Assets
	 */
	async findDocumentsWithAssetsByApplicationId(application_id: number) {
		return await this.repository.findDocumentsWithAssetsByApplicationId(application_id);
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
	 * Exchanges a JWT for a Google OAuth access token
	 * @returns {Promise<string>} The access token
	 */
	getGoogleAccessToken = async (): Promise<string> => {
		const jwt = await createGoogleJWT();

		const response = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
				assertion: jwt,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to get access token: ${error}`);
		}

		const data = (await response.json()) as { access_token: string };
		return data.access_token;
	};

	/**
	 * Uploads a file to Google Drive
	 * @param {ArrayBuffer | Uint8Array} fileData - The file data to upload
	 * @param {string} fileName - The name of the file
	 * @param {string} mimeType - The MIME type of the file
	 * @param {string} folderId - Optional folder ID to upload to
	 * @returns {Promise<{id: string, name: string, webViewLink: string}>} The uploaded file information
	 */
	uploadToGoogleDrive = async (
		fileData: ArrayBuffer | Uint8Array,
		fileName: string,
		mimeType: string,
		companyFolderId: string,
	): Promise<{ id: string; name: string; webViewLink: string }> => {
		const accessToken = await this.getGoogleAccessToken();

		// Convert ArrayBuffer to Uint8Array if needed
		const data = fileData instanceof ArrayBuffer ? new Uint8Array(fileData) : fileData;

		// Create metadata for the file
		const metadata: {
			name: string;
			mimeType: string;
			parents?: string[];
		} = {
			name: fileName,
			mimeType: mimeType,
		};

		if (companyFolderId) {
			metadata.parents = [companyFolderId];
		}

		// Upload using multipart upload for better compatibility
		const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2, 15)}`;
		const metadataPart = JSON.stringify(metadata);

		// Build multipart body
		const encoder = new TextEncoder();

		const parts: Uint8Array[] = [];

		// Add metadata part
		parts.push(encoder.encode(`--${boundary}\r\n`));
		parts.push(encoder.encode(`Content-Type: application/json; charset=UTF-8\r\n\r\n`));
		parts.push(encoder.encode(metadataPart));
		parts.push(encoder.encode(`\r\n--${boundary}\r\n`));
		parts.push(encoder.encode(`Content-Type: ${mimeType}\r\n\r\n`));

		// Add file data
		parts.push(data);

		// Add closing boundary
		parts.push(encoder.encode(`\r\n--${boundary}--\r\n`));

		// Combine all parts
		const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
		const body = new Uint8Array(totalLength);
		let offset = 0;
		for (const part of parts) {
			body.set(part, offset);
			offset += part.length;
		}

		const response = await fetch(
			'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink',
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': `multipart/related; boundary=${boundary}`,
				},
				body: body,
			},
		);

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Failed to upload to Google Drive: ${error}`);
		}

		const fileInfo = (await response.json()) as {
			id: string;
			name: string;
			webViewLink?: string;
		};

		// Get web view link if not provided
		let { webViewLink } = fileInfo;
		if (!webViewLink) {
			const getFileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileInfo.id}?fields=webViewLink`, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			});

			if (getFileResponse.ok) {
				const fileDetails = (await getFileResponse.json()) as { webViewLink?: string };
				webViewLink = fileDetails.webViewLink || `https://drive.google.com/file/d/${fileInfo.id}/view`;
			} else {
				webViewLink = `https://drive.google.com/file/d/${fileInfo.id}/view`;
			}
		}

		return {
			id: fileInfo.id,
			name: fileInfo.name,
			webViewLink: webViewLink,
		};
	};
	/**
	 * Gets or creates a folder in Google Drive
	 * @param {string} companyName - The name of the company (folder name)
	 * @param {string} rootFolderId - The ID of the root folder to create the company folder in
	 * @returns {Promise<string>} The ID of the company folder
	 */

	async getOrCreateFolder(folderName: string, parentId: string): Promise<string> {
		const accessToken = await this.getGoogleAccessToken();
		const normalizedName = normalizeFolderName(folderName);

		const query = encodeURIComponent(
			`name='${normalizedName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
		);

		const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)&supportsAllDrives=true`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		type FileResponse = { files: { id: string }[] };
		const { files } = (await searchRes.json()) as FileResponse;
		if (files?.length) return files[0].id;

		// Create folder if not exists
		const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				name: normalizedName,
				mimeType: 'application/vnd.google-apps.folder',
				parents: [parentId],
			}),
		});
		type Folder = { id: string };
		const folder = (await createRes.json()) as Folder;
		return folder.id;
	}
}
