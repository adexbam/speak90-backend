import type { FastifyInstance } from "fastify";

export const validateYearType = (
    app: FastifyInstance,
    year: string,
    type: string
): { year: string; type: string } => {
    const normalizedType = type?.toLowerCase();
    if (normalizedType !== "easter" && normalizedType !== "advent") {
        const err = app.httpErrors.badRequest(
            "type must be either easter or advent"
        ) as Error & { details?: unknown };
        err.details = [
            { path: "type", message: "type must be either easter or advent" },
        ];
        throw err;
    }
    if (!/^\d{4}$/.test(year)) {
        const err = app.httpErrors.badRequest(
            "year must be YYYY"
        ) as Error & { details?: unknown };
        err.details = [{ path: "year", message: "year must be YYYY" }];
        throw err;
    }
    return { year, type: normalizedType };
};
