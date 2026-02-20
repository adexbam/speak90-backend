import type { FastifyInstance } from "fastify";
import {
    createDeviceSessionHandler,
    refreshDeviceSessionHandler,
} from "./auth.handlers.js";
import {
    createDeviceSessionSchema,
    refreshDeviceSessionSchema,
} from "./auth.schemas.js";

export async function authRoutes(app: FastifyInstance) {
    app.post(
        "/device-session",
        {
            config: { public: true },
            schema: createDeviceSessionSchema,
        },
        createDeviceSessionHandler
    );

    app.post(
        "/refresh",
        {
            config: { public: true },
            schema: refreshDeviceSessionSchema,
        },
        refreshDeviceSessionHandler
    );

    const env = (process.env.DEPLOYMENT_ENV || "dev").toLowerCase();
    const isDebugEnv = env === "local" || env === "dev" || env === "test";
    if (isDebugEnv) {
        app.get(
            "/test",
            { config: { auth: true } },
            async (request, _reply) => {
                return {
                    ok: true,
                    user: (request as any).user ?? null,
                };
            }
        );
    }
}
