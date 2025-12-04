
import { Server } from './web/server';
import { Hono } from 'hono';

const app = new Hono();
const server = new Server(app);

// Configure routes and services once at module load
await server.configure();

export default {
	async fetch(request, env, ctx): Promise<Response> {
		return app.fetch(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
