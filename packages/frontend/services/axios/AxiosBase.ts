import type { AxiosError } from 'axios';
import axios from 'axios';

import { appConfig } from '$utils/config';

import AxiosRequestIntrceptorConfigCallback from './AxiosRequestIntrceptorConfigCallback';
import AxiosResponseIntrceptorErrorCallback from './AxiosResponseIntrceptorErrorCallback';

const AxiosBase = axios.create({
  timeout: 60000,
  baseURL: appConfig.apiBaseUrl + appConfig.apiVersion,
});

AxiosBase.interceptors.request.use(
  (config) => {
    return AxiosRequestIntrceptorConfigCallback(config);
  },
  (error) => {
    return Promise.reject(error);
  }
);

AxiosBase.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    AxiosResponseIntrceptorErrorCallback(error);
    return Promise.reject(error);
  }
);

export default AxiosBase;
