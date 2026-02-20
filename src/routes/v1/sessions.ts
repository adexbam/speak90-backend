import type { FastifyInstance } from "fastify";
import { postSessionCompleteHandler } from "./sessions.handlers.js";
import { postSessionCompleteSchema } from "./sessions.schemas.js";

export async function sessionsRoutes(app: FastifyInstance) {
    app.post(
        "/complete",
        {
            config: { auth: true },
            schema: postSessionCompleteSchema,
        },
        postSessionCompleteHandler
    );
}
