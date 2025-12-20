import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { StatusCodes } from 'http-status-codes';

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const serveData = (c: Context, data: any) => {
	return c.json(data);
};

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const serve = (c: Context, status: StatusCodes, data: any) => {
	return c.json(data, <ContentfulStatusCode>status);
};

export { serve, serveData };
