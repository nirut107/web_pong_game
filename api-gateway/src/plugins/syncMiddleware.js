/**
 * API Gateway Synchronization Middleware
 * This middleware observes requests passing through the gateway and ensures 
 * data consistency between authentication and user services
 */

export default async function syncMiddleware(request, reply) {
	// Sync for only these mod routes
	const isUserModification = (
		(request.method === 'PUT' || request.method === 'PATCH' || request.method === 'POST') &&
		(request.url.includes('/users/') || request.url.includes('/auth/'))
	);

	if (!isUserModification) {
		return;
	}

	const originalEnd = reply.raw.end;

	reply.raw.end = async function (chunk, encoding) {
		reply.raw.end = originalEnd;

		reply.raw.end(chunk, encoding);

		if (reply.statusCode >= 200 && reply.statusCode < 300) {
			try {
				// Extract user data
				let userData;

				if (chunk) {
					try {
						const body = chunk.toString();
						userData = JSON.parse(body);
					} catch (e) {
						request.log.warn('Could not parse response body for sync', e);
					}
				}

				if (userData && userData.id) {
					setTimeout(async () => {
						try {
							await triggerDataSync(userData, request);
						} catch (syncError) {
							request.log.error('Error synchronizing data:', syncError);
						}
					}, 0);
				}
			} catch (error) {
				request.log.error('Error in sync middleware:', error);
			}
		}
	};
}

/**
 * Trigger data synchronization between services
 */
async function triggerDataSync(userData, request) {
	const dataIntegrityServiceUrl = process.env.DATA_INTEGRITY_SERVICE_URL ||
		'http://data-integrity-service:3000/api/v1';

	try {
		request.log.info(`Triggering immediate data sync for user ID: ${userData.id}`);

		const response = await fetch(`${dataIntegrityServiceUrl}/users/verify/${userData.id}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				userId: userData.id,
				sourceSystem: 'api-gateway',
				triggerPath: request.url,
				triggerMethod: request.method
			})
		});

		if (response.ok) {
			const result = await response.json();
			request.log.info(`Data sync completed for user ${userData.id}:`, result);
		} else {
			request.log.warn(`Data sync service returned ${response.status}`);
		}
	} catch (error) {
		request.log.error(`Failed to trigger data sync for user ${userData.id}:`, error);
	}
} 