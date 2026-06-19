import { apiFetch } from "./api";
import type {
  BusinessUpsertBody,
  CreateAssetBody,
  CreateAssetResponse,
  FinancialDocumentBody,
  FinancialDocumentResponse,
  FinancialProgressResponse,
} from "./financeTypes";

// All helpers are SERVER-SIDE (SSR + route handlers). The browser never calls
// the backend directly, so no CORS change is needed on the existing API.

export const getFinancialProgress = (token: string) =>
  apiFetch<FinancialProgressResponse>("/financial-wizard/progress", { token });

export const createAsset = (body: CreateAssetBody, token: string) =>
  apiFetch<CreateAssetResponse>("/asset", { method: "POST", token, body });

export const uploadFinancialDocument = (body: FinancialDocumentBody, token: string) =>
  apiFetch<FinancialDocumentResponse>("/financial-wizard/document", {
    method: "POST",
    token,
    body,
  });

export const deleteFinancialDocument = (id: number, token: string) =>
  apiFetch<{ message: string }>(`/financial-wizard/document/${id}`, {
    method: "DELETE",
    token,
  });

// Advances the wizard by marking a page as the current/completed page.
export const updateFinancialPage = (page: string, token: string) =>
  apiFetch<{ message: string }>("/financial-wizard/page", {
    method: "POST",
    token,
    body: { page },
  });

// Saves business-profile answers (e.g. inventory location, funding history).
export const upsertBusiness = (body: BusinessUpsertBody, token: string) =>
  apiFetch<{ message: string }>("/business/my", { method: "POST", token, body });

// Marks the application as submitted/complete (drives progress to 100%).
export const completeFinancialApplication = (token: string) =>
  apiFetch<{ message: string }>("/financial-wizard/complete", { method: "POST", token });
