const fastify = require('fastify')({ logger: true });
const metricsPlugin = require('./plugins/metrics');
const authPlugin = require('./plugins/auth');
const port = process.env.PORT || 3000;
const mappedPort = process.env.MAPPED_PORT || '?';
const initDatabase = require('./db/init');
const metricsRoutes = require('./routes/metrics');
const path = require('path');
const Database = require('better-sqlite3');
const dbConfig = require('./config/database');

initDatabase();

const db = new Database(dbConfig.filename);

fastify.decorate('sqlite', {
	get: (query, params) => {
		const stmt = db.prepare(query);
		return stmt.get(...(params || []));
	},
	all: (query, params) => {
		const stmt = db.prepare(query);
		return stmt.all(...(params || []));
	},
	run: (query, params) => {
		const stmt = db.prepare(query);
		return stmt.run(...(params || []));
	}
});

fastify.register(authPlugin);
fastify.register(metricsPlugin);
fastify.register(metricsRoutes, { prefix: '/api/v1/metrics' });
fastify.register(metricsRoutes, { prefix: '/api/v1/analytics/metrics' });

fastify.get('/health', async (request, reply) => {
	return { status: 'healthy' };
});

fastify.get('/', async (request, reply) => {
	return {
		name: 'Analytics Service API',
		description: 'Analytics service API',
		version: '1.0.0',
		endpoints: [
			{ method: 'GET', path: '/health', description: 'Health check endpoint' },
			{ method: 'GET', path: '/metrics', description: 'Prometheus metrics endpoint' },
			{ method: 'GET', path: '/api/v1/metrics', description: 'Analytics metrics API' },
			{ method: 'GET', path: '/api/v1/analytics/metrics', description: 'Analytics metrics API (alternative path)' }
		]
	};
});

const start = async () => {
	try {
		await fastify.listen({ port, host: '0.0.0.0' });
		fastify.log.info(`Analytics service listening on port ${port}, mapped to external port ${mappedPort}`);
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start(); 