import type { User } from './auth';

export interface Business {
  id: number;
  legal_name: string;
  email: string;
  phone: string;
  dial_code: string;
  year_formed: string;
  accounting_software: string;
  other_accounting_software: string;
  headquarters: string;
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
  legal_name: string;
  headquarters: string;
  description: string;
  year_formed: string;
  accounting_software: string;
  other_accounting_software: string;
}

export interface UploadBusinessLogoRequest {
  businessId: number;
  imageBase64: string;
  fileName: string;
  [key: string]: unknown;
}

export type BusinessQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export type GetAllBusinessesResponse = {
  businesses: Business[];
  total: number;
};
