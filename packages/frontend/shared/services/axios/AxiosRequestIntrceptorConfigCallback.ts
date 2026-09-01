import type { InternalAxiosRequestConfig } from 'axios';
import { appConfig } from 'shared/utils/config';

import { getCookie } from '$utils/auth';

const AxiosRequestIntrceptorConfigCallback = (config: InternalAxiosRequestConfig) => {
  const storage = appConfig.accessTokenPersistStrategy;

  if (storage === 'localStorage' || storage === 'sessionStorage' || storage === 'cookie') {
    let accessToken = '';

    if (storage === 'localStorage') {
      accessToken = localStorage.getItem(appConfig.TOKEN_NAME_IN_STORAGE) || '';
    }

    if (storage === 'sessionStorage') {
      accessToken = sessionStorage.getItem(appConfig.TOKEN_NAME_IN_STORAGE) || '';
    }

    if (storage === 'cookie') {
      accessToken = getCookie(appConfig.TOKEN_NAME_IN_STORAGE) || '';
    }

    if (accessToken) {
      config.headers[appConfig.REQUEST_HEADER_AUTH_KEY] = `${appConfig.TOKEN_TYPE} ${accessToken}`;
    }
  }

  // Dynamically set X-Team-Id header from localStorage
  const teamId = localStorage.getItem('x-team-id');
  if (teamId) {
    config.headers['X-Team-Id'] = teamId;
  }

  // Deal context for team members working on a host's deal application (set when opening an application).
  const dealId = localStorage.getItem('x-deal-id');
  if (dealId) {
    config.headers['X-Deal-Id'] = dealId;
  }

  return config;
};

export default AxiosRequestIntrceptorConfigCallback;
