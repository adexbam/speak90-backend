import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import type { FastifyReply, FastifyRequest } from "fastify";
import { logger } from "../utils/logger.js";


dotenv.config();

type AuthRequest = FastifyRequest & { user?: any };

export const authenticate = async (
    req: AuthRequest,
    reply: FastifyReply
) => {
    const { token: bodyToken } = (req.body as any) || {};
    const token =
        bodyToken ||
        (typeof req.headers.authorization === "string"
            ? req.headers.authorization.split(" ")[1]
            : undefined);
    if (!token) {
        return reply.status(401).send({
            error: "Missing token in request body or Authorization header",
        });
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return reply.status(500).send({
                error: "JWT_SECRET is not configured",
            });
        }
        const decoded = jwt.verify(token, secret);

        // req.user = {};
        req.user = decoded; // contains huuid, groups, etc.
    } catch (err) {
        logger.error(
            {
                err,
                event: "auth.token_verification.failed",
                data: { token_present: true },
            },
            "Token validation failed"
        );
        return reply.status(401).send({
            error: "Unauthorized: invalid or expired token",
        });
    }
};

export const authorize = (allowedGroups: string[] = []) => {
    return async (req: AuthRequest, reply: FastifyReply) => {
        if (!req.user || !Array.isArray((req.user as any).groups)) {
            return reply
                .status(403)
                .send({ error: "No user groups found in token." });
        }

        const hasGroup = (req.user as any).groups.some((group: string) =>
            allowedGroups.includes(group)
        );
        if (!hasGroup) {
            return reply.status(403).send({
                error: "Insufficient permissions for this operation.",
            });
        }
    };
};

export const authenticateAndAuthorize =
    (requiredGroups: string[] = []) =>
    async (req: AuthRequest, reply: FastifyReply) => {
        const { token: bodyToken } = (req.body as any) || {};
        const token =
            bodyToken ||
            (typeof req.headers.authorization === "string"
                ? req.headers.authorization.split(" ")[1]
                : undefined);

        if (!token) {
            return reply.status(401).send({
                error: "Missing token in request body or Authorization header",
            });
        }

        try {
            const secret = process.env.JWT_SECRET;
            if (!secret) {
                return reply.status(500).send({
                    error: "JWT_SECRET is not configured",
                });
            }
            const decoded = jwt.verify(token, secret);

            const userGroups = Array.isArray((decoded as any).groups)
                ? (decoded as any).groups
                : [];

            const hasPermission = requiredGroups.some((group) =>
                userGroups.includes(group)
            );

            if (!hasPermission) {
                return reply.status(403).send({
                    error: "Insufficient permissions: group membership required",
                    requiredGroups,
                    userGroups,
                });
            }

            req.user = decoded;
        } catch (err) {
            logger.error(
                {
                    err,
                    event: "auth.token_verification.failed",
                    data: { token_present: true },
                },
                "Token validation failed"
            );
            return reply.status(401).send({
                error: "Unauthorized: invalid or expired token",
            });
        }
    };
