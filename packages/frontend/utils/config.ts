type DevMode = 'true' | 'remote-dev' | 'production';

const devMode: DevMode = localStorage.getItem('devMode') as DevMode;

const API_LOCAL_DEV_URL = 'http://127.0.0.1:8787';
const API_REMOTE_DEV_URL = 'https://assembled-brands-dev.bx-reverse-proxy.workers.dev/';
const API_PROD_URL = 'https://assembled-brands-prod.bx-reverse-proxy.workers.dev/';

export const config = {
    apiUrl: devMode == 'true' ? API_LOCAL_DEV_URL : devMode == 'remote-dev' ? API_REMOTE_DEV_URL : API_PROD_URL,
}