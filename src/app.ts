import type { FastifyInstance } from "fastify";

import Fastify from "fastify";
import { registerErrorHandler } from "./config/error.handler.js";
import { getLoggerConfig, pinoDestination } from "./config/pino.config.js";
import { registerRequestLogger } from "./config/request.logger.js";
import { registerRoutes } from "./config/routes.js";
import securityPlugins from "./config/security.js";
import { closeDb, initializeDb } from "./db/client.js";
import { authenticate } from "./middleware/authMiddleware.js";
import jwtPlugin from "./utils/jwt.js";
import { logEvent } from "./utils/logger.js";

export interface AppConfig {
    deploymentEnv?: string;
    jwtSecret?: string;
}

function isUnknownRoute(routeUrl?: string): boolean {
    return !routeUrl;
}

export async function App(config: AppConfig = {}) {
    const env = config.deploymentEnv || process.env.DEPLOYMENT_ENV || "dev";
    const loggerConfig = getLoggerConfig(env);

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

    if (env === "test" && config.jwtSecret) {
        process.env.JWT_SECRET = config.jwtSecret;
    }

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

    registerErrorHandler(app);
    registerRequestLogger(app);
    await app.register(securityPlugins);
    await app.register(jwtPlugin);

    app.addHook("preHandler", async (request, reply) => {
        const currentRoute = request.routeOptions?.url;

        if (isUnknownRoute(currentRoute)) {
            return;
        }

        const routeConfig = request.routeOptions?.config || {};
        const requiresAuth =
            routeConfig.auth === true || routeConfig.public === false;

        if (requiresAuth) {
            await authenticate(request, reply);
        }
    });

    await registerRoutes(app);

    return app;
}
