import { and, desc, eq, like, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import type { Asset, NewAsset, schema } from '../schema/schema.js';
import { assetsSchema } from '../schema/schema.js';
import type { AssetQuery } from '../web/validator/asset.js';

export interface AssetSearchQuery {
  asset_type?: 'image' | 'video' | 'audio' | 'document';
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
}

export class AssetRepository   {
  private db: DrizzleD1Database<typeof schema>;

  constructor(db: DrizzleD1Database<typeof schema>) {
    this.db = db;
  }

  async create(asset: NewAsset): Promise<number> {
    const result = await this.db.insert(assetsSchema).values(asset).returning();
    return result[0].id;
  }

  async find(id: number): Promise<Asset | undefined> {
    const result = await this.db
      .select()
      .from(assetsSchema)
      .where(eq(assetsSchema.id, id))
      .limit(1);
    return result[0];
  }

  async findByUserId(
    userId: number,
    query?: AssetQuery,
  ): Promise<{ assets: Asset[]; total: number }> {
    const { page = 1, limit = 50, search, asset_type } = query || {};
    const offset = (page - 1) * limit;

    const whereConditions = [];
    whereConditions.push(eq(assetsSchema.user_id, userId));

    if (search) {
      whereConditions.push(like(assetsSchema.asset_name, `%${search}%`));
    }

    if (asset_type) {
      whereConditions.push(eq(assetsSchema.asset_type, asset_type));
    }

    const assets = await this.db
      .select()
      .from(assetsSchema)
      .where(and(...whereConditions))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(assetsSchema.created_at));

    const total = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(assetsSchema)
      .where(and(...whereConditions));

    return { assets, total: total.length };
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(assetsSchema).where(eq(assetsSchema.id, id));
  }

  async update(id: number, asset: Partial<Asset>): Promise<void> {
    await this.db.update(assetsSchema).set(asset).where(eq(assetsSchema.id, id));
  }

  async findByQuery(query: AssetSearchQuery): Promise<{ assets: Asset[]; total: number }> {
    const whereConditions = [];

    if (query.asset_type) {
      whereConditions.push(eq(assetsSchema.asset_type, query.asset_type));
    }

    const assets = await this.db
      .select()
      .from(assetsSchema)
      .where(and(...whereConditions))
      .orderBy(desc(assetsSchema.created_at));

    return { assets, total: assets.length };
  }

  async findByMediaConvertJobId(jobId: string): Promise<Asset | undefined> {
    const result = await this.db
      .select()
      .from(assetsSchema)
      .where(eq(assetsSchema.mediaconvert_job_id, jobId))
      .limit(1);
    return result[0];
  }

  async updateProcessingStatus(id: number, data: Partial<Asset>): Promise<void> {
    await this.db
      .update(assetsSchema)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(assetsSchema.id, id));
  }

  
}
