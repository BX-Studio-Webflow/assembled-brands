import pino from 'pino';
import { env } from 'process';


const logger = pino.pino({
  level: env.LOG_LEVEL || 'info',
});
export { logger };
