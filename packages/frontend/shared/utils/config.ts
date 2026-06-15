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

type NavigateToPathOptions = {
  useRootPath?: boolean;
};

export const navigateToPath = (path: string, options?: NavigateToPathOptions) => {
  if (!path) {
    console.error('navigateToPath: path is empty or undefined');
    return;
  }

  const [pathPart, queryPart] = path.split('?');
  const normalizedPath = pathPart.replace(/^\/+/, '');

  let finalPath = normalizedPath;
  if (!options?.useRootPath) {
    finalPath = `dev/${normalizedPath}`;
  }

  const querySuffix = queryPart ? `?${queryPart}` : '';
  const newUrl = `${window.location.origin}/${finalPath}${querySuffix}`;

  window.location.assign(newUrl);
};
