import type { FastifyReply, FastifyRequest } from "fastify";
import { hasActivePremiumEntitlement } from "../repositories/entitlement.repository.js";
import { ERROR_CODES } from "../utils/error-codes.js";
import { httpError } from "../utils/http-errors.js";

const PREMIUM_REQUIRED_MESSAGE = "Premium subscription required for cloud features";

export async function requirePremiumEntitlement(
    request: FastifyRequest,
    _reply: FastifyReply
) {
    const subjectId = (request.user as { sub?: string } | undefined)?.sub;
    if (!subjectId) {
        throw request.server.httpErrors.unauthorized("Missing token subject");
    }

    const isPremium = await hasActivePremiumEntitlement(subjectId);
    if (!isPremium) {
        throw httpError(
            request,
            "forbidden",
            PREMIUM_REQUIRED_MESSAGE,
            ERROR_CODES.premiumRequired
        );
    }
}
