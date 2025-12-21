type DevMode = 'local' | 'remote-dev' | 'production';

const devMode: DevMode = localStorage.getItem('api-mode') as DevMode;

const API_LOCAL_DEV_URL = 'http://127.0.0.1:8787';
const API_REMOTE_DEV_URL = 'https://assembled-brands-dev.crystal-e8a.workers.dev';
const API_PROD_URL = 'https://assembled-brands-prod.crystal-e8a.workers.dev';

export const appConfig = {
  apiBaseUrl:
    devMode === 'local'
      ? API_LOCAL_DEV_URL
      : devMode === 'remote-dev'
        ? API_REMOTE_DEV_URL
        : API_PROD_URL,
  apiVersion: '/api/v1',
  accessTokenPersistStrategy: 'cookie',
  TOKEN_NAME_IN_STORAGE: 'accessToken',
  TOKEN_TYPE: 'Bearer',
  REQUEST_HEADER_AUTH_KEY: 'Authorization',
};

//navigate to path depending on dev mode
export const navigateToPath = (path: string, skipDevMode: boolean = false) => {
  let newPath: string = '';
  if (devMode === 'local' && !skipDevMode) {
    newPath = `/dev${path}`;
  } else if (devMode === 'remote-dev' && !skipDevMode) {
    newPath = `/dev${path}`;
  } else {
    newPath = `/${path}`;
  }
  window.location.assign(newPath);
};
