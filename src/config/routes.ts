import swagger from "@fastify/swagger";
import type { FastifyInstance } from "fastify";
import { healthRoutes } from "../routes/v1/health/health.js";
import { authRoutes } from "../routes/v1/auth.js";
import { audioUploadsRoutes } from "../routes/v1/audio-uploads.js";
import { configRoutes } from "../routes/v1/config.js";
import { consentRoutes } from "../routes/v1/consents.js";
import { progressRoutes } from "../routes/v1/progress.js";
import { sessionsRoutes } from "../routes/v1/sessions.js";
import { srsRoutes } from "../routes/v1/srs.js";
import { scalarOptions, swaggerOptions } from "./api-docs.config.js";
import { upLoadRoutes } from "../routes/v1/upload/upload.js";
import { userSettingsRoutes } from "../routes/v1/user-settings.js";

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
        prefix: "/v1/upload",
    });
    await app.register(authRoutes, { prefix: "/v1/auth" });
    await app.register(audioUploadsRoutes, { prefix: "/v1/audio/uploads" });
    await app.register(configRoutes, { prefix: "/v1/config" });
    await app.register(consentRoutes, { prefix: "/v1/consents" });
    await app.register(progressRoutes, { prefix: "/v1/progress" });
    await app.register(srsRoutes, { prefix: "/v1/srs" });
    await app.register(sessionsRoutes, { prefix: "/v1/sessions" });
    await app.register(userSettingsRoutes, { prefix: "/v1/user/settings" });

    // Temporary legacy aliases (to be removed after client migration).
    await app.register(upLoadRoutes, {
        prefix: "/api/v1/upload",
    });
    await app.register(authRoutes, { prefix: "/api/v1/auth" });

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
