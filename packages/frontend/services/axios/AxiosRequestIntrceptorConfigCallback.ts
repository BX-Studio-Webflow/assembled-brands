import type { InternalAxiosRequestConfig } from 'axios';

import { appConfig } from '$utils/config';

const AxiosRequestIntrceptorConfigCallback = (config: InternalAxiosRequestConfig) => {
  const storage = appConfig.accessTokenPersistStrategy;

  if (storage === 'localStorage' || storage === 'sessionStorage') {
    let accessToken = '';

    if (storage === 'localStorage') {
      accessToken = localStorage.getItem(appConfig.TOKEN_NAME_IN_STORAGE) || '';
    }

    if (storage === 'sessionStorage') {
      accessToken = sessionStorage.getItem(appConfig.TOKEN_NAME_IN_STORAGE) || '';
    }

    if (accessToken) {
      config.headers[appConfig.REQUEST_HEADER_AUTH_KEY] = `${appConfig.TOKEN_TYPE}${accessToken}`;
    }
  }

  // Dynamically set X-Team-Id header from localStorage
  const teamId = localStorage.getItem('team_id');
  if (teamId) {
    config.headers['X-Team-Id'] = teamId;
  }

  return config;
};

export default AxiosRequestIntrceptorConfigCallback;
