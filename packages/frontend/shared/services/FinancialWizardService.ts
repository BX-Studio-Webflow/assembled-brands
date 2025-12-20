import type {
  CompleteApplicationResponse,
  DeleteDocumentResponse,
  FinancialDocumentBody,
  FinancialDocumentResponse,
  FinancialDocumentsResponse,
  FinancialStep1Body,
  FinancialStep1Response,
  FinancialWizardProgressResponse,
  UpdateStepBody,
  UpdateStepResponse,
} from '../types/financial-wizard';
import ApiService from './ApiService';

export const apiSaveFinancialStep1 = (data: FinancialStep1Body) => {
  return ApiService.fetchDataWithAxios<FinancialStep1Response>({
    url: '/financial-wizard/step1',
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

export const apiGetFinancialProgress = () => {
  return ApiService.fetchDataWithAxios<FinancialWizardProgressResponse>({
    url: '/financial-wizard/progress',
    method: 'get',
  });
};

export const apiGetFinancialDocumentsByStep = (step: number) => {
  return ApiService.fetchDataWithAxios<FinancialDocumentsResponse>({
    url: `/financial-wizard/documents/${step}`,
    method: 'get',
  });
};

export const apiUpdateFinancialStep = (data: UpdateStepBody) => {
  return ApiService.fetchDataWithAxios<UpdateStepResponse>({
    url: '/financial-wizard/step',
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
