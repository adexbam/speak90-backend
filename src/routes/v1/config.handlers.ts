import type { FastifyReply, FastifyRequest } from "fastify";
import { getAppFeatureFlags } from "../../services/feature-flag.service.js";

export async function getConfigFlagsHandler(
    _request: FastifyRequest,
    reply: FastifyReply
) {
    const flags = await getAppFeatureFlags();
    reply.code(200);
    return flags;
}
