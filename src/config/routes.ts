import swagger from "@fastify/swagger";
import type { FastifyInstance } from "fastify";
import { healthRoutes } from "../routes/v1/health/health.js";
import { authRoutes } from "../routes/v1/auth.js";
import { configRoutes } from "../routes/v1/config.js";
import { scalarOptions, swaggerOptions } from "./api-docs.config.js";
import { upLoadRoutes } from "../routes/v1/upload/upload.js";

export async function registerRoutes(app: FastifyInstance) {
    // Swagger/OpenAPI
    await app.register(swagger, swaggerOptions);

    app.get(
        "/openapi.json",
        { schema: { hide: true }, config: { public: true } },
        async (_req, reply) =>
            reply.type("application/json").send(app.swagger())
    );

    // Application routes
    await app.register(healthRoutes, { prefix: "/" });
    await app.register(upLoadRoutes, {
        prefix: "api/v1/upload",
    });
    await app.register(authRoutes, { prefix: "api/v1/auth" });
    await app.register(authRoutes, { prefix: "/v1/auth" });
    await app.register(configRoutes, { prefix: "/v1/config" });

    // API reference (Scalar routes are plugin-generated, so we mark them public here)
    app.addHook("onRoute", (route) => {
        if (route.url?.startsWith("/reference")) {
            (route as any).config = { ...(route as any).config, public: true };
        }
    });
    const { default: scalarPlugin } = await import(
        "@scalar/fastify-api-reference"
    );
    await app.register(scalarPlugin, scalarOptions);
}
