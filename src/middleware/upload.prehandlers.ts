import type { FastifyRequest } from "fastify";

export async function uploadPreHandler(request: FastifyRequest) {
    const body = request.body as any;
    const folder = body?.folder?.value ?? body?.folder;
    if (folder !== undefined && typeof folder !== "string") {
        const err = request.server.httpErrors.badRequest(
            "folder must be a string"
        ) as Error & { details?: unknown };
        err.details = [{ path: "folder", message: "folder must be a string" }];
        throw err;
    }
    if (folder !== undefined) {
        request.uploadFolder = folder;
    }
}
