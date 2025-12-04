import pino from 'pino';



const logger = pino.pino({
  level: env.LOG_LEVEL || 'info',
});
export { logger };
