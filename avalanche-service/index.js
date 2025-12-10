const fastify = require('fastify')({ 
	logger: true,
	disableRequestLogging: process.env.NODE_ENV === 'production'
});

const tournamentRoutes = require('./routes/submitScore');


const port = process.env.PORT || 3000;
const mappedPort = process.env.MAPPED_PORT || port;

fastify.register(require('@fastify/cors'), {
	origin: true,
	methods: ['GET', 'POST'],
	credentials: true,
	maxAge: 86400
});


fastify.register(async (instance) => {
	instance.register(tournamentRoutes);
}, { prefix: '' });


// Start the server
const start = async () => {
	try {
		await fastify.listen({ port, host: '0.0.0.0' });
		fastify.log.info(`Game service listening on port ${port}, mapped to external port ${mappedPort}`);
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();