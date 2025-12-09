export type AssetType = 'image' | 'video' | 'audio' | 'document';

export type CreateAssetBody = {
  fileName: string;
  contentType: string;
  assetType: AssetType;
  fileSize: number;
  duration: number;
};

export type CreateMultipartAssetBody = {
  fileName: string;
  contentType: string;
  assetType: AssetType;
  fileSize: number;
  duration: number;
  partSize: number;
};

export type RenameAssetBody = {
  fileName: string;
};

export type CompleteMultipartUploadBody = {
  parts: Array<{
    ETag: string;
    PartNumber: number;
  }>;
};

export type AssetQuery = {
  page?: number;
  limit?: number;
  search?: string;
  asset_type?: AssetType;
};

export type Asset = {
  id: number;
  user_id: number;
  asset_name: string;
  asset_type: AssetType;
  asset_url: string | null;
  hls_url: string | null;
  content_type: string;
  file_size: number;
  duration: number | null;
  processing_status: string | null;
  mediaconvert_job_id: string | null;
  mediaconvert_job_status: string | null;
  mediaconvert_job_progress: number | null;
  mediaconvert_job_current_phase: string | null;
  created_at: string;
  updated_at: string;
  presignedUrl?: string;
};

export type CreateAssetResponse = {
  asset: Asset;
  uploadUrl: string;
  message?: string;
};

export type CreateMultipartAssetResponse = {
  asset: Asset;
  uploadId: string;
  presignedUrls: string[];
  message?: string;
};

export type GetAssetResponse = Asset;

export type GetAssetsResponse = {
  assets: Asset[];
  total: number;
};

export type RenameAssetResponse = {
  message: string;
};

export type CompleteMultipartUploadResponse = {
  message: string;
  asset: Asset;
};

export type StartHlsConversionResponse = {
  message: string;
  jobId: string;
};

export type DeleteAssetResponse = {
  message: string;
};
