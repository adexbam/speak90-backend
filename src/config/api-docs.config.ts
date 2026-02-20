export const swaggerOptions = {
    openapi: {
        openapi: "3.1.0",
        info: { title: "Content-delegation-backend API", version: "1.0.0" },
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
        title: "Content-delegation-backend API Reference",
        url: "/openapi.json",
        authentication: { preferredSecurityScheme: "bearerAuth" },
        theme: "purple",
    },
} as any;
