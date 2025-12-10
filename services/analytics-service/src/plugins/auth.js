const fp = require('fastify-plugin');

async function authPlugin(fastify, options) {
	const authServiceUrls = [
		process.env.AUTH_SERVICE_URL || 'http://auth-service:3000/api/v1'
	];

	function validateJwtLocally(token) {
		try {
			const parts = token.split('.');
			if (parts.length !== 3) {
				return null;
			}

			const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
			if (!payload || !payload.userId) {
				return null;
			}

			if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
				return null;
			}

			return {
				userId: payload.userId,
				username: payload.username || 'unknown',
				email: payload.email
			};
		} catch (error) {
			fastify.log.error('JWT local validation error:', error);
			return null;
		}
	}

	fastify.decorate('authenticate', async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader) {
				throw new Error('No authorization header');
			}

			const token = authHeader.replace('Bearer ', '');
			
			if (!token || token.trim() === '') {
				throw new Error('Invalid token format');
			}

			const localValidation = validateJwtLocally(token);
			if (localValidation) {
				fastify.log.info(`Validated token locally for user ${localValidation.userId}`);
				request.user = {
					userId: localValidation.userId,
					username: localValidation.username
				};
				return;
			}

			let validationError = null;
			for (const authServiceUrl of authServiceUrls) {
				try {
					fastify.log.info(`Validating token against ${authServiceUrl}`);
					const response = await fetch(`${authServiceUrl}/validate`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ token }),
						signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined
					});

					if (!response.ok) {
						const errorData = await response.json().catch(() => ({}));
						fastify.log.warn(`Auth validation failed with ${authServiceUrl}: ${response.status}`, errorData);
						validationError = new Error(`Token validation with ${authServiceUrl} failed: ${response.statusText}`);
						continue;
					}

					const data = await response.json();

					if (!data || !data.valid) {
						validationError = new Error('Token validation returned invalid result');
						continue;
					}

					if (!data.userId) {
						validationError = new Error('User ID missing from token validation response');
						continue;
					}

					request.user = {
						userId: data.userId,
						username: data.username || 'unknown'
					};
					
					fastify.log.info(`Successfully validated token for user ${data.userId} with ${authServiceUrl}`);
					return;
				} catch (fetchError) {
					fastify.log.warn(`Error validating token with ${authServiceUrl}:`, fetchError);
					validationError = fetchError;
				}
			}

			const fallbackValidation = validateJwtLocally(token);
			if (fallbackValidation) {
				fastify.log.warn('Using fallback local validation due to auth service unavailability');
				request.user = {
					userId: fallbackValidation.userId,
					username: fallbackValidation.username
				};
				return;
			}

			throw validationError || new Error('Failed to validate token with any auth service');
		} catch (err) {
			fastify.log.error('Authentication failed:', err.message);
			reply.code(401).send({ 
				error: 'Unauthorized', 
				message: err.message,
				code: 'AUTH_ERROR'
			});
			return reply;
		}
	});
}

module.exports = fp(authPlugin, { name: 'authenticate' }); 