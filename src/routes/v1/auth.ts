import type { FastifyInstance } from "fastify";
import { createDeviceSessionHandler } from "./auth.handlers.js";
import { createDeviceSessionSchema } from "./auth.schemas.js";

export async function authRoutes(app: FastifyInstance) {
    app.post(
        "/device-session",
        {
            config: { public: true },
            schema: createDeviceSessionSchema,
        },
        createDeviceSessionHandler
    );

    app.get(
        "/test",
        { config: { public: false } },
        async (request, _reply) => {
            return {
                ok: true,
                user: (request as any).user ?? null,
            };
        }
    );
}
