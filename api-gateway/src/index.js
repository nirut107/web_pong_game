import dotenv from "dotenv";
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import httpProxy from "@fastify/http-proxy";
import client from "prom-client";
import syncMiddleware from "./plugins/syncMiddleware.js";

dotenv.config();

const PORT = process.env.PORT || 8000;

const fastify = Fastify({
  logger: true,
});

const register = new client.Registry();
register.setDefaultLabels({ app: "api-gateway" });
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

const httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

const activeConnections = new client.Gauge({
  name: "active_connections",
  help: "Number of active connections",
  registers: [register],
});

// Service conf
const serviceConfig = {
  auth: {
    upstream: process.env.AUTH_SERVICE_URL || "http://auth-service:3000",
    prefix: "/api/v1/auth",
  },
  user: {
    upstream: process.env.USER_SERVICE_URL || "http://user-service:3000",
    prefix: "/api/v1/users",
  },
  userGetProfile: {
    upstream: process.env.USER_SERVICE_URL || "http://user-service:3000",
    prefix: "/api/v1/get-user-profile",
    rewritePrefix: "/api/v1/get-user-profile",
  },
  game: {
    upstream: process.env.GAME_SERVICE_URL || "http://game-service:3000",
    prefix: "/api/v1/games",
    rewritePrefix: "/api/v1/games",
  },
  tournament: {
    upstream: process.env.GAME_SERVICE_URL || "http://game-service:3000",
    prefix: "/api/v1/tournaments",
    rewritePrefix: "/api/v1/tournaments",
  },
  chat: {
    upstream: process.env.CHAT_SERVICE_URL || "http://chat-service:3000",
    prefix: "/api/v1/chat",
  },
  analytics: {
    upstream:
      process.env.ANALYTICS_SERVICE_URL || "http://analytics-service:3000",
    prefix: "/api/v1/analytics",
  },
  integrity: {
    upstream:
      process.env.DATA_INTEGRITY_SERVICE_URL ||
      "http://data-integrity-service:3000",
    prefix: "/api/v1/integrity",
  },
  messages: {
    upstream: process.env.MESSAGE_SERVICE_URL || "http://message-service:3000",
    prefix: "/api/v1/messages",
    rewritePrefix: "/api/v1",
  },
  unreadMessages: {
    upstream: process.env.MESSAGE_SERVICE_URL || "http://message-service:3000",
    prefix: "/api/v1/messages/unread",
    rewritePrefix: "/api/v1/unread",
  },
};

const setupServer = async () => {
  try {
    await fastify.register(fastifyCors, {
      origin: true,
      methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    });

    // Register the syncMiddleware as a hook
    fastify.addHook("onRequest", syncMiddleware);

    fastify.addHook("onRequest", (request, reply, done) => {
      request.metrics = {
        startTime: process.hrtime(),
      };
      activeConnections.inc();
      done();
    });

    fastify.addHook("onResponse", (request, reply, done) => {
      const { startTime } = request.metrics || { startTime: process.hrtime() };
      const duration = process.hrtime(startTime);
      const durationInSeconds = duration[0] + duration[1] / 1e9;

      httpRequestsTotal.inc({
        method: request.method,
        route: request.routeOptions ? request.routeOptions.url : request.url,
        status: reply.statusCode,
      });

      httpRequestDurationSeconds.observe(
        {
          method: request.method,
          route: request.routeOptions ? request.routeOptions.url : request.url,
          status: reply.statusCode,
        },
        durationInSeconds
      );

      activeConnections.dec();
      done();
    });

    for (const [key, service] of Object.entries(serviceConfig)) {
      let rewritePrefix = service.rewritePrefix || "/api/v1";

      if (key === "user") {
        rewritePrefix = "/api/v1/users";
      }

      await fastify.register(httpProxy, {
        upstream: service.upstream,
        prefix: service.prefix,
        rewritePrefix: rewritePrefix,
        http2: false,
      });
      fastify.log.info(
        `Registered proxy for ${key} service: ${service.prefix} -> ${service.upstream}`
      );
    }

    fastify.get("/health", async (request, reply) => {
      return {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      };
    });

    fastify.get("/metrics", async (request, reply) => {
      reply.header("Content-Type", register.contentType);
      return await register.metrics();
    });

    // Custom endpoints that need to be registered before the proxy
    fastify.get("/api/v1/profile", async (request, reply) => {
      try {
        const token = request.headers.authorization;
        if (!token) {
          reply.code(401).send({ error: "Unauthorized - No token provided" });
          return;
        }

        const authResponse = await fetch(
          `${serviceConfig.auth.upstream}/api/v1/me`,
          {
            headers: {
              Authorization: token,
            },
          }
        );

        if (!authResponse.ok) {
          if (authResponse.status === 401) {
            reply.code(401).send({ error: "Unauthorized" });
            return;
          }
          reply
            .code(authResponse.status)
            .send({ error: "Error fetching user data from auth service" });
          return;
        }

        const authData = await authResponse.json();

        const userResponse = await fetch(
          `${serviceConfig.user.upstream}/api/v1/users/${authData.id}/profile`,
          {
            headers: {
              Authorization: token,
            },
          }
        );

        if (userResponse.status === 404) {
          return {
            id: authData.id,
            username: authData.username,
            email: authData.email,
            isActive: authData.isActive,
            profile: null,
          };
        }

        if (!userResponse.ok) {
          return {
            id: authData.id,
            username: authData.username,
            email: authData.email,
            isActive: authData.isActive,
            profile: null,
          };
        }

        const profileData = await userResponse.json();

        return {
          id: authData.id,
          username: authData.username,
          email: authData.email,
          isActive: authData.isActive,
          profile: {
            displayName: profileData.displayName || authData.username,
            avatarUrl: profileData.avatarUrl,
            status: profileData.status,
            bio: profileData.bio,
          },
        };
      } catch (error) {
        fastify.log.error(
          `Error in unified profile endpoint: ${error.message}`
        );
        reply.code(500).send({ error: "Internal server error" });
      }
    });

    fastify.get("/", async (request, reply) => {
      return {
        message: "Transcendence API Gateway",
        services: Object.entries(serviceConfig).reduce(
          (acc, [key, service]) => {
            acc[key] = service.prefix;
            return acc;
          },
          {}
        ),
        health: "/health",
        metrics: "/metrics",
      };
    });

    await fastify.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`API Gateway listening on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

setupServer();
