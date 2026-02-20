import type { FastifyInstance } from "fastify";

// Env is loaded in src/server.ts; keep App env-agnostic.
import Fastify from "fastify";
import { registerErrorHandler } from "./config/error.handler.js";
import { getLoggerConfig, pinoDestination } from "./config/pino.config.js";
import { registerRequestLogger } from "./config/request.logger.js";
import { registerRoutes } from "./config/routes.js";
import securityPlugins from "./config/security.js";
import { closeDb, initializeDb } from "./db/client.js";
import { loadAllEnvConfig } from "./utils/env.loader.js";
import jwtPlugin from "./utils/jwt.js";
import { logEvent } from "./utils/logger.js";
import { authenticate } from "./middleware/authMiddleware.js";

export interface AppConfig {
    deploymentEnv?: string;
    mongoUri?: string;
    jwtSecret?: string;
}

// Determines if a route is public based on route options or URL patterns.
function isPublicRoute(request: {
    url: string;
    routeOptions?: { config?: any };
}) {
    if (request.routeOptions?.config?.public) return true;
    if (request.url.startsWith("/reference")) return true; // scalar plugin routes
    return false;
}

function isUnknownRoute(routeUrl?: string): boolean {
    return !routeUrl;
}

export async function App(config: AppConfig = {}) {
    const env = config.deploymentEnv || process.env.DEPLOYMENT_ENV || "dev";
    const loggerConfig = getLoggerConfig(env);

    // Use explicit pino destination for non-local environments (ensures single-line JSON)
    const app =
        env === "local"
            ? Fastify({
                  logger: loggerConfig,
                  disableRequestLogging: true,
              })
            : Fastify({
                  logger: {
                      ...(loggerConfig as object),
                      stream: pinoDestination,
                  },
                  disableRequestLogging: true,
              });

    // Load environment configuration from SSM (for non-local environments)
    // SSM/env is the source of truth outside of tests.
    if (env === "test") {
        if (!config.mongoUri) {
            throw new Error(
                "App(config) in test requires mongoUri to avoid real DB usage"
            );
        }
        if (config.mongoUri) {
            process.env.MONGO_URI_RW = config.mongoUri;
        }
        if (config.jwtSecret) {
            process.env.JWT_SECRET = config.jwtSecret;
        }
    }

    await loadAllEnvConfig(env);

    // Initialize database connection after loading environment variables
    try {
        await initializeDb();
        app.addHook("onClose", async () => {
            await closeDb();
        });
    } catch (error) {
        logEvent(
            app.log,
            "app.start.failed",
            {
                data: { step: "db.init" },
                error: {
                    type: error instanceof Error ? error.name : "Error",
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                },
            },
            "Failed to initialize database"
        );
        throw error;
    }

    // Register plugins in optimal order
    // 1. Error handling (catches errors from all subsequent plugins)
    registerErrorHandler(app);

    // 2. Request logging (logs all incoming requests)
    registerRequestLogger(app);

    // 3. Security plugins (CORS, helmet, rate limiting)
    await app.register(securityPlugins);

    // 4. JWT authentication
    await app.register(jwtPlugin);

    // 5. Authentication preHandler hook
    app.addHook("preHandler", async (request, reply) => {
        const currentRoute = request.routeOptions?.url;

        // Skip JWT for unknown routes so the notFound handler can respond uniformly.
        if (isUnknownRoute(currentRoute)) {
            return;
        }

        // Only enforce auth for routes that explicitly opt in
        if (request.routeOptions?.config?.auth === true) {
            await authenticate(request, reply);
        }
    });

    // 6. Register all application routes (last)
    await registerRoutes(app);

    return app;
}
