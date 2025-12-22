type DevMode = 'local' | 'remote-dev' | 'production';

const devMode: DevMode = localStorage.getItem('api-mode') as DevMode;

const API_LOCAL_DEV_URL = 'http://127.0.0.1:8787';
const API_REMOTE_DEV_URL = 'https://assembled-brands-dev.crystal-e8a.workers.dev';
//const API_PROD_URL = 'https://assembled-brands-prod.crystal-e8a.workers.dev';

export const appConfig = {
  apiBaseUrl: devMode === 'local' ? API_LOCAL_DEV_URL : API_REMOTE_DEV_URL,
  apiVersion: '/api/v1',
  accessTokenPersistStrategy: 'cookie',
  TOKEN_NAME_IN_STORAGE: 'accessToken',
  TOKEN_TYPE: 'Bearer',
  REQUEST_HEADER_AUTH_KEY: 'Authorization',
};

export const navigateToPath = (path: string) => {
  if (!path) {
    console.error('navigateToPath: path is empty or undefined');
    return;
  }

  // Read dev mode from localStorage or default to 'prod'
  //const devMode = localStorage.getItem('api-mode') || 'production';

  // Normalize the path: remove any leading slashes
  const normalizedPath = path.replace(/^\/+/, '');

  // Determine the path based on devMode
  let finalPath = normalizedPath;
  /*
  Disable check for now as we have only dev pages!!
  TODO: Enable this check when we have production pages
  if (!skipDevMode && (devMode === 'local' || devMode === 'remote-dev')) {
    finalPath = `dev/${normalizedPath}`;
  }*/
  finalPath = `dev/${normalizedPath}`;

  // Prepend the current origin to always stay on the same domain
  const newUrl = `${window.location.origin}/${finalPath}`;

  window.location.assign(newUrl);
};
