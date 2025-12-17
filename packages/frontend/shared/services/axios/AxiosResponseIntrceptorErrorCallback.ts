import type { AxiosError } from 'axios';

import { deleteCookie } from '$utils/auth';
import { navigateToPath } from '$utils/config';

const UNAUTHORIZED_CODES = [401, 419, 440];

const AxiosResponseIntrceptorErrorCallback = (error: AxiosError) => {
  console.warn(error);
  const { response } = error;

  if (response && UNAUTHORIZED_CODES.includes(response.status)) {
    deleteCookie('accessToken');
    navigateToPath('/login?error=unauthorized', false);
  }
};

export default AxiosResponseIntrceptorErrorCallback;
