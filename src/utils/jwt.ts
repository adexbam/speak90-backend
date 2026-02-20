import fastifyJwt from "@fastify/jwt";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { logEvent } from "./logger.js";
import { setRequestContext } from "./request-context.js";

const jwtPlugin: FastifyPluginAsync = fp(async (app) => {
    const env = (process.env.DEPLOYMENT_ENV || "dev").toLowerCase();
    const secret = process.env.JWT_SECRET;
    if (!secret && env !== "local" && env !== "test") {
        throw new Error("JWT_SECRET is required outside local/test");
    }

    app.register(fastifyJwt, {
        secret: secret || "supersecret",
    });

    app.decorate(
        "verifyToken",
        async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                // Verify the JWT token
                const decoded = await request.jwtVerify();

                // Attach decoded token to request for use in route handlers
                (request as any).user = decoded;
                setRequestContext({ user: { id: (decoded as any)?.sub } });

                logEvent(
                    request.log,
                    "auth.user.authenticated",
                    {
                        request_id: request.requestContext?.requestId,
                        user: { id: (decoded as any)?.sub },
                    },
                    "User authenticated"
                );
            } catch (error) {
                logEvent(
                    request.log,
                    "auth.token.verification_failed",
                    {
                        request_id: request.requestContext?.requestId,
                        error: {
                            type: error instanceof Error ? error.name : "Error",
                            message:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                    },
                    "Token verification failed"
                );

                throw error;
            }
        }
    );
});

export function extractBearerToken(request: FastifyRequest): string | null {
    // biome-ignore lint/complexity/useLiteralKeys: <intentional>
    const authHeader = request.headers["authorization"];

    if (!authHeader || typeof authHeader !== "string") return null;

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) return null;

    return token;
}

export default jwtPlugin;
