import type {
  CompleteApplicationResponse,
  DeleteDocumentResponse,
  FinancialApplicationsResponse,
  FinancialDocumentBody,
  FinancialDocumentResponse,
  FinancialDocumentsResponse,
  FinancialOverviewBody,
  FinancialOverviewResponse,
  FinancialWizardProgressResponse,
  UpdatePageBody,
  UpdatePageResponse,
} from '../types/financial-wizard';
import ApiService from './ApiService';

export const apiSaveFinancialOverview = (data: FinancialOverviewBody) => {
  return ApiService.fetchDataWithAxios<FinancialOverviewResponse>({
    url: '/financial-wizard/financial-overview',
    method: 'post',
    data,
  });
};

export const apiUploadFinancialDocument = (data: FinancialDocumentBody) => {
  return ApiService.fetchDataWithAxios<FinancialDocumentResponse>({
    url: '/financial-wizard/document',
    method: 'post',
    data,
  });
};

export const apiGetFinancialProgress = (userId?: string) => {
  return ApiService.fetchDataWithAxios<FinancialWizardProgressResponse>({
    url: '/financial-wizard/progress',
    method: 'get',
    params: userId ? { user_id: userId } : undefined,
  });
};

export const apiGetFinancialDocumentsByPage = (page: string) => {
  return ApiService.fetchDataWithAxios<FinancialDocumentsResponse>({
    url: `/financial-wizard/documents/${page}`,
    method: 'get',
  });
};

export const apiUpdateFinancialPage = (data: UpdatePageBody) => {
  return ApiService.fetchDataWithAxios<UpdatePageResponse>({
    url: '/financial-wizard/page',
    method: 'post',
    data,
  });
};

export const apiCompleteFinancialApplication = () => {
  return ApiService.fetchDataWithAxios<CompleteApplicationResponse>({
    url: '/financial-wizard/complete',
    method: 'post',
  });
};

export const apiDeleteFinancialDocument = (id: number) => {
  return ApiService.fetchDataWithAxios<DeleteDocumentResponse>({
    url: `/financial-wizard/document/${id}`,
    method: 'delete',
  });
};

export const apiAdminGetApplications = () => {
  return ApiService.fetchDataWithAxios<FinancialApplicationsResponse[]>({
    url: `/financial-wizard/applications`,
    method: 'get',
  });
};
