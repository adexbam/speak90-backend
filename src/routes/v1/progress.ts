import type { FastifyInstance } from "fastify";
import { getProgressHandler, putProgressHandler } from "./progress.handlers.js";
import { getProgressSchema, putProgressSchema } from "./progress.schemas.js";

export async function progressRoutes(app: FastifyInstance) {
    app.put(
        "/",
        {
            config: { auth: true },
            schema: putProgressSchema,
        },
        putProgressHandler
    );

    app.get(
        "/",
        {
            config: { auth: true },
            schema: getProgressSchema,
        },
        getProgressHandler
    );
}
