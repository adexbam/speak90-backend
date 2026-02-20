import type { FastifyRequest } from "fastify";
declare module "fastify" {
    interface FastifyRequest {
        user?: {
            sub?: string;
            email?: string;
            name?: string;
            [key: string]: any;
        };
        requestContext?: {
            requestId: string;
            startTime: number;
        };
        uploadFolder?: string;
    }

    interface FastifyContextConfig {
        public?: boolean;
        auth?: boolean;
    }
}
