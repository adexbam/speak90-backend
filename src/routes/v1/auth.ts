import type { FastifyInstance } from "fastify";

export async function authRoutes(app: FastifyInstance) {
    app.get(
        "/test",
        { config: { public: false } },
        async (request, _reply) => {
            return {
                ok: true,
                user: (request as any).user ?? null,
            };
        }
    );
}
