import type {
  BusinessQuery,
  GetAllBusinessesResponse,
  GetBusinessResponse,
  UpdateBusinessRequest,
} from '../types/business';
import ApiService from './ApiService';

export const apiGetBusiness = () => {
  return ApiService.fetchDataWithAxios<GetBusinessResponse>({
    url: '/business/my',
    method: 'get',
  });
};

export const apiUpdateBusiness = (data: UpdateBusinessRequest) => {
  return ApiService.fetchDataWithAxios<void>({
    url: '/business/my',
    method: 'post',
    data,
  });
};

export const apiGetAllBusinesses = (params?: BusinessQuery) => {
  return ApiService.fetchDataWithAxios<GetAllBusinessesResponse>({
    url: '/business',
    method: 'get',
    params,
  });
};
