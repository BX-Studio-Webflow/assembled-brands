import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const assetQuerySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
  search: z.string().optional(),
  asset_type: z.enum(['image', 'video', 'audio', 'document']).optional(),
});

export const createAssetSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
  assetType: z.enum(['image', 'video', 'audio', 'document']),
  fileSize: z.number(),
  duration: z.number(),
});

export const createMultipartAssetSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
  assetType: z.enum(['image', 'video', 'audio', 'document']),
  fileSize: z.number(),
  duration: z.number(),
  partSize: z.number(),
});

export const renameAssetSchema = z.object({
  fileName: z.string().refine((val) => /\.[a-zA-Z0-9]+$/.test(val), {
    message: 'File name must include an extension',
  }),
});

export const completeMultipartUploadSchema = z.object({
  parts: z.array(
    z.object({
      ETag: z.string(),
      PartNumber: z.number(),
    }),
  ),
});

// MediaConvert Webhook Schemas
export const mediaConvertWebhookSchema = z.object({
  version: z.string(),
  id: z.string(),
  'detail-type': z.literal('MediaConvert Job State Change'),
  source: z.literal('aws.mediaconvert'),
  account: z.string(),
  time: z.string(),
  region: z.string(),
  resources: z.array(z.string()),
  detail: z.object({
    timestamp: z.number(),
    accountId: z.string(),
    queue: z.string(),
    jobId: z.string(),
    status: z.enum(['COMPLETE', 'STATUS_UPDATE', 'ERROR', 'PROGRESSING']),
    userMetadata: z.record(z.any()),
    warnings: z
      .array(
        z.object({
          code: z.number(),
          count: z.number(),
        }),
      )
      .optional(),
    outputGroupDetails: z
      .array(
        z.object({
          outputDetails: z.array(
            z.object({
              outputFilePaths: z.array(z.string()),
              durationInMs: z.number(),
              videoDetails: z
                .object({
                  widthInPx: z.number(),
                  heightInPx: z.number(),
                  qvbrAvgQuality: z.number(),
                  qvbrMinQuality: z.number(),
                  qvbrMaxQuality: z.number(),
                  qvbrMinQualityLocation: z.number(),
                  qvbrMaxQualityLocation: z.number(),
                })
                .optional(),
            }),
          ),
          type: z.string(),
        }),
      )
      .optional(),
    paddingInserted: z.number().optional(),
    blackVideoDetected: z.number().optional(),
    blackSegments: z
      .array(
        z.object({
          start: z.number(),
          end: z.number(),
        }),
      )
      .optional(),
    framesDecoded: z.number().optional(),
    jobProgress: z
      .object({
        phaseProgress: z.record(
          z.object({
            status: z.string(),
            percentComplete: z.number(),
          }),
        ),
        jobPercentComplete: z.number(),
        currentPhase: z.string(),
        retryCount: z.number(),
      })
      .optional(),
  }),
});

export const assetQueryValidator = zValidator('query', assetQuerySchema);

export const createAssetValidator = zValidator('json', createAssetSchema);
export const createMultipartAssetValidator = zValidator('json', createMultipartAssetSchema);
export const renameAssetValidator = zValidator('json', renameAssetSchema);
export const completeMultipartUploadValidator = zValidator('json', completeMultipartUploadSchema);

export type CreateAssetBody = z.infer<typeof createAssetSchema>;
export type CreateMultipartAssetBody = z.infer<typeof createMultipartAssetSchema>;
export type RenameAssetBody = z.infer<typeof renameAssetSchema>;
export type AssetQuery = z.infer<typeof assetQuerySchema>;
export type CompleteMultipartUploadBody = z.infer<typeof completeMultipartUploadSchema>;
export type MediaConvertWebhookPayload = z.infer<typeof mediaConvertWebhookSchema>;
