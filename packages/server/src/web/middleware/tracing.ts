import { createMiddleware } from 'hono/factory';
import { randomString } from '../../util/string';
import { TRACING } from '../../lib/constants';


export const tracing = createMiddleware(async (c, next) => {
  c.set(TRACING, randomString(10));
  await next();
});
