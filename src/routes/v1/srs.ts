import type { FastifyInstance } from "fastify";
import {
    getSrsCardsHandler,
    postSrsReviewHandler,
    putSrsCardsBulkHandler,
} from "./srs.handlers.js";
import {
    getSrsCardsSchema,
    postSrsReviewSchema,
    putSrsCardsBulkSchema,
} from "./srs.schemas.js";

export async function srsRoutes(app: FastifyInstance) {
    app.put(
        "/cards/bulk",
        {
            config: { auth: true },
            schema: putSrsCardsBulkSchema,
        },
        putSrsCardsBulkHandler
    );

    app.get(
        "/cards",
        {
            config: { auth: true },
            schema: getSrsCardsSchema,
        },
        getSrsCardsHandler
    );

    app.post(
        "/reviews",
        {
            config: { auth: true },
            schema: postSrsReviewSchema,
        },
        postSrsReviewHandler
    );
}
