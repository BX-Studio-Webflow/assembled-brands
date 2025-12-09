import { User } from './auth';

export interface Business {
  id: number;
  name: string;
  email: string;
  phone: string;
  dial_code: string;
  address: string;
  logo: string;
  logo_asset_id: number;
  created_at: string;
  description: string;
  user_id: number;
}

export interface GetBusinessResponse {
  business: Business;
  user: User;
}

export interface UpdateBusinessRequest extends Record<string, unknown> {
  name: string;
  address: string;
  email: string;
  dial_code: string;
  phone: string;
}

export interface UploadBusinessLogoRequest {
  businessId: number;
  imageBase64: string;
  fileName: string;
  [key: string]: unknown;
}
