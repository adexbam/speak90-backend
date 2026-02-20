import type { FastifyInstance } from "fastify";
import { getConfigFlagsHandler } from "./config.handlers.js";
import { getConfigFlagsSchema } from "./config.schemas.js";

export async function configRoutes(app: FastifyInstance) {
    app.get(
        "/flags",
        {
            config: { public: true },
            schema: getConfigFlagsSchema,
        },
        getConfigFlagsHandler
    );
}
