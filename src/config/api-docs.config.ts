export const swaggerOptions = {
    openapi: {
        openapi: "3.1.0",
        info: { title: "Speak90-backend API", version: "1.0.0" },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
} as any;

export const scalarOptions = {
    routePrefix: "/reference" as `/${string}`,
    configuration: {
        title: "Speak90-backend API Reference",
        url: "/openapi.json",
        authentication: { preferredSecurityScheme: "bearerAuth" },
        theme: "purple",
    },
} as any;
