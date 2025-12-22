import type { AxiosError } from 'axios';

import { deleteCookie } from '$utils/auth';
import { navigateToPath } from '$utils/config';

const UNAUTHORIZED_CODES = [401, 419, 440];

const AxiosResponseIntrceptorErrorCallback = (error: AxiosError) => {
  const { response } = error;

  // Skip if login request
  if (window.location.pathname.includes('/login')) {
    return Promise.reject(error);
  }

  if (response && UNAUTHORIZED_CODES.includes(response.status)) {
    deleteCookie('accessToken');
    navigateToPath('/login?error=unauthorized');
  }
};

export default AxiosResponseIntrceptorErrorCallback;
