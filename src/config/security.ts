import cors, { type FastifyCorsOptions } from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import fp from "fastify-plugin";
import { logEvent } from "../utils/logger.js";

export default fp(async function securityPlugins(fastify) {
    const env = (process.env.DEPLOYMENT_ENV || "dev").toLowerCase();
    const corsAllowlist = (process.env.CORS_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

    if (env !== "local" && env !== "dev" && corsAllowlist.length === 0) {
        logEvent(
            fastify.log,
            "security.cors.allowlist.empty",
            { env },
            "CORS_ORIGINS is empty; all cross-origin requests will be blocked."
        );
    }

    const corsOrigin: FastifyCorsOptions["origin"] = async (
        origin: string | undefined
    ) => {
        if (env === "local" || env === "dev") return true;
        if (!origin) return false;
        if (corsAllowlist.length === 0) return false;
        return corsAllowlist.includes(origin);
    };

    await fastify.register(sensible);
    await fastify.register(helmet, {
        global: true,
        crossOriginResourcePolicy: { policy: "cross-origin" },
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
                styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
                fontSrc: ["'self'", "cdn.jsdelivr.net", "data:"],
                imgSrc: ["'self'", "data:", "cdn.jsdelivr.net"],
                connectSrc: ["'self'"],
            },
        },
    });
    await fastify.register(cors, {
        origin: corsOrigin,
        credentials: true,
        methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
        exposedHeaders: ["Content-Disposition"],
    });
    await fastify.register(rateLimit, { max: 300, timeWindow: "1 minute" });
});
