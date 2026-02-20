import type { FastifyInstance } from "fastify";
import {
    faviconHandler,
    healthcheckHandler,
    rootHandler,
} from "./health.handlers.js";

export async function healthRoutes(app: FastifyInstance) {
    // Handle root path
    app.get("/", { config: { public: true } }, rootHandler);

    // Handle favicon.ico to prevent authentication errors and logs
    app.get("/favicon.ico", { config: { public: true } }, faviconHandler);

    app.get(
        "/healthcheck",
        {
            config: { public: true },
            schema: {
                tags: ["Health"],
                summary: "Health check",
                description: "Check if the service is healthy",
            },
        },
        healthcheckHandler
    );

}
