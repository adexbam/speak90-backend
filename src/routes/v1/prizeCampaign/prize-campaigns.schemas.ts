export const createPrizeCampaignSchema = {
    tags: ["PrizeCampaigns"],
    summary: "Create prize campaign",
    description: "Create prize campaign for a year and type",
    body: {
        type: "object",
        required: ["name", "year", "type", "status"],
        properties: {
            name: { type: "string" },
            year: { type: "string" },
            type: { type: "string", enum: ["easter", "advent"] },
            status: { type: "string" },
            daviz: {
                type: "object",
                properties: {
                    davizUrlId: { type: "string" },
                    davizUrl: { type: "string" },
                    kicker: { type: "string" },
                    headline: { type: "string" },
                    subline: { type: "string" },
                },
            },
            prizes: {
                type: "array",
                items: {
                    type: "object",
                    required: [
                        "id",
                        "date",
                        "prize",
                        "headline",
                        "description",
                        "article_link",
                        "image_url_vertical",
                        "image_url_horizontal",
                        "logo",
                        "logo_url",
                        "Anmerkungen",
                        "is_bild_plus",
                    ],
                    properties: {
                        id: { type: "number" },
                        date: { type: "string" },
                        prize: { type: "string" },
                        headline: { type: "string" },
                        description: { type: "string" },
                        article_link: { type: "string" },
                        image_url_vertical: { type: "string" },
                        image_url_horizontal: { type: "string" },
                        logo: { type: "string" },
                        logo_url: { type: "string" },
                        Anmerkungen: { type: "string" },
                        is_bild_plus: { type: "boolean" },
                    },
                },
            },
        },
    },
    response: {
        201: {
            type: "object",
            additionalProperties: true,
            properties: {
                _id: { type: "string" },
                name: { type: "string" },
                year: { type: "string" },
                type: { type: "string", enum: ["easter", "advent"] },
                status: { type: "string" },
                daviz: {
                    type: "object",
                    properties: {
                        davizUrlId: { type: "string" },
                        davizUrl: { type: "string" },
                        kicker: { type: "string" },
                        headline: { type: "string" },
                        subline: { type: "string" },
                    },
                    additionalProperties: true,
                },
                prizes: { type: "array" },
            },
        },
    },
} as const;

export const listPrizeCampaignsSchema = {
    tags: ["PrizeCampaigns"],
    summary: "List all prize campaigns",
    description: "Fetch all prize campaigns",
    response: {
        200: { type: "array", items: { type: "object", additionalProperties: true } },
    },
} as const;

export const listPrizeCampaignsByYearAndTypeSchema = {
    tags: ["PrizeCampaigns"],
    summary: "List prize campaigns by year and type",
    description: "Fetch all prize campaigns for a year and type",
    params: {
        type: "object",
        required: ["year", "type"],
        properties: {
            year: { type: "string" },
            type: { type: "string", enum: ["easter", "advent"] },
        },
    },
    response: {
        200: { type: "array", items: { type: "object", additionalProperties: true } },
    },
} as const;

export const listPrizeCampaignsPaginationSchema = {
    tags: ["PrizeCampaigns"],
    summary: "List prize campaigns (paginated)",
    description: "Fetch prize campaigns with pagination",
    querystring: {
        type: "object",
        properties: {
            limit: { type: "integer", minimum: 1, maximum: 100 },
            offset: { type: "integer", minimum: 0 },
        },
    },
    response: {
        200: { type: "array", items: { type: "object", additionalProperties: true } },
    },
} as const;

export const listPrizeCampaignsByYearAndTypePaginationSchema = {
    tags: ["PrizeCampaigns"],
    summary: "List prize campaigns by year and type (paginated)",
    description: "Fetch prize campaigns for a year/type with pagination",
    params: listPrizeCampaignsByYearAndTypeSchema.params,
    querystring: {
        type: "object",
        properties: {
            limit: { type: "integer", minimum: 1, maximum: 100 },
            offset: { type: "integer", minimum: 0 },
        },
    },
    response: {
        200: { type: "array", items: { type: "object", additionalProperties: true } },
    },
} as const;

export const getPrizeCampaignByIdSchema = {
    tags: ["PrizeCampaigns"],
    summary: "Get prize campaign by id",
    description: "Fetch prize campaign by id",
    params: {
        type: "object",
        required: ["id"],
        properties: {
            id: { type: "string" },
        },
    },
    response: {
        200: { type: "object", additionalProperties: true },
    },
} as const;

export const updatePrizeCampaignByIdSchema = {
    tags: ["PrizeCampaigns"],
    summary: "Update prize campaign by id",
    description: "Update prize campaign by id",
    params: getPrizeCampaignByIdSchema.params,
    body: {
        type: "object",
        required: ["name", "status"],
        properties: {
            name: { type: "string" },
            year: { type: "string" },
            type: { type: "string", enum: ["easter", "advent"] },
            status: { type: "string" },
            daviz: {
                type: "object",
                properties: {
                    davizUrlId: { type: "string" },
                    davizUrl: { type: "string" },
                    kicker: { type: "string" },
                    headline: { type: "string" },
                    subline: { type: "string" },
                },
            },
            prizes: {
                type: "array",
                items: createPrizeCampaignSchema.body.properties.prizes.items,
            },
        },
    },
    response: {
        200: { type: "object", additionalProperties: true },
    },
} as const;

export const patchPrizeCampaignByIdSchema = {
    tags: ["PrizeCampaigns"],
    summary: "Patch prize campaign by id",
    description: "Partially update prize campaign by id",
    params: getPrizeCampaignByIdSchema.params,
    body: {
        type: "object",
        properties: {
            name: { type: "string" },
            year: { type: "string" },
            type: { type: "string", enum: ["easter", "advent"] },
            status: { type: "string" },
                daviz: {
                    type: "object",
                    properties: {
                        davizUrlId: { type: "string" },
                        davizUrl: { type: "string" },
                        kicker: { type: "string" },
                        headline: { type: "string" },
                    subline: { type: "string" },
                },
            },
            prizes: {
                type: "array",
                items: createPrizeCampaignSchema.body.properties.prizes.items,
            },
        },
    },
    response: {
        200: { type: "object", additionalProperties: true },
    },
} as const;

export const updatePrizeCampaignPrizesByIdSchema = {
    tags: ["PrizeCampaigns"],
    summary: "Update prize campaign prizes by id",
    description: "Replace prizes array for a prize campaign by id",
    params: getPrizeCampaignByIdSchema.params,
    body: {
        type: "object",
        required: ["prizes"],
        properties: {
            prizes: {
                type: "array",
                items: createPrizeCampaignSchema.body.properties.prizes.items,
            },
        },
    },
    response: {
        200: { type: "object", additionalProperties: true },
    },
} as const;

export const patchPrizeBySubdocumentIdSchema = {
    tags: ["PrizeCampaigns"],
    summary: "Patch prize subdocument by id",
    description: "Update a single prize subdocument by its _id",
    params: {
        type: "object",
        required: ["campaignId", "prizeId"],
        properties: {
            campaignId: { type: "string" },
            prizeId: { type: "string" },
        },
    },
    body: {
        type: "object",
        properties: {
            id: { type: "number" },
            date: { type: "string" },
            prize: { type: "string" },
            headline: { type: "string" },
            description: { type: "string" },
            article_link: { type: "string" },
            image_url_vertical: { type: "string" },
            image_url_horizontal: { type: "string" },
            logo: { type: "string" },
            logo_url: { type: "string" },
            Anmerkungen: { type: "string" },
            is_bild_plus: { type: "boolean" },
        },
    },
    response: {
        200: { type: "object", additionalProperties: true },
    },
} as const;

export const deletePrizeCampaignByIdSchema = {
    tags: ["PrizeCampaigns"],
    summary: "Delete prize campaign by id",
    description: "Delete prize campaign by id",
    params: getPrizeCampaignByIdSchema.params,
    response: {
        200: {
            type: "object",
            additionalProperties: true,
            properties: {
                deleted: { type: "boolean" },
                id: { type: "string" },
            },
        },
    },
} as const;
