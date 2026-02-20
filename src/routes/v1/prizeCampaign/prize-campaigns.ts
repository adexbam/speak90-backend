import type { FastifyInstance } from "fastify";
import {
    createPrizeCampaignHandler,
    deletePrizeCampaignByIdHandler,
    getPrizeCampaignByIdHandler,
    listPrizeCampaignsByYearTypeHandler,
    listPrizeCampaignsByYearTypePaginatedHandler,
    listPrizeCampaignsHandler,
    listPrizeCampaignsPaginatedHandler,
    patchPrizeBySubdocumentIdHandler,
    patchPrizeCampaignByIdHandler,
    replacePrizeCampaignPrizesHandler,
    updatePrizeCampaignByIdHandler,
} from "./prize-campaigns.handlers.js";
import {
    createBodyPreHandler,
    idPreHandler,
    paginationPreHandler,
    prizeParamsPreHandler,
    prizePatchBodyPreHandler,
    prizesBodyPreHandler,
    updateBodyPreHandler,
    yearTypePreHandler,
} from "../../../middleware/prize-campaign.prehandlers.js";
import {
    createPrizeCampaignSchema,
    deletePrizeCampaignByIdSchema,
    getPrizeCampaignByIdSchema,
    listPrizeCampaignsSchema,
    listPrizeCampaignsByYearAndTypeSchema,
    listPrizeCampaignsPaginationSchema,
    listPrizeCampaignsByYearAndTypePaginationSchema,
    patchPrizeCampaignByIdSchema,
    patchPrizeBySubdocumentIdSchema,
    updatePrizeCampaignPrizesByIdSchema,
    updatePrizeCampaignByIdSchema,
} from "./prize-campaigns.schemas.js";

export async function prizeCampaignRoutes(app: FastifyInstance) {
    app.get(
        "/",
        { schema: listPrizeCampaignsSchema, config: { auth: false } },
        listPrizeCampaignsHandler
    );

    app.get(
        "/paginated",
        {
            schema: listPrizeCampaignsPaginationSchema,
            preHandler: paginationPreHandler(app),
            config: { auth: true },
        },
        listPrizeCampaignsPaginatedHandler
    );

    app.post(
        "/",
        {
            schema: createPrizeCampaignSchema,
            preHandler: createBodyPreHandler,
            config: { auth: true },
        },
        createPrizeCampaignHandler
    );

    app.get(
        "/:year/:type",
        {
            schema: listPrizeCampaignsByYearAndTypeSchema,
            preHandler: yearTypePreHandler,
            config: { auth: true },
        },
        listPrizeCampaignsByYearTypeHandler
    );

    app.get(
        "/:year/:type/paginated",
        {
            schema: listPrizeCampaignsByYearAndTypePaginationSchema,
            preHandler: [yearTypePreHandler, paginationPreHandler(app)],
            config: { auth: true },
        },
        listPrizeCampaignsByYearTypePaginatedHandler
    );

    app.get(
        "/id/:id",
        { schema: getPrizeCampaignByIdSchema, preHandler: idPreHandler, config: { auth: false } },
        getPrizeCampaignByIdHandler
    );

    app.put(
        "/id/:id",
        { schema: updatePrizeCampaignByIdSchema, preHandler: [idPreHandler, updateBodyPreHandler], config: { auth: true } },
        updatePrizeCampaignByIdHandler
    );

    app.patch(
        "/id/:id",
        { schema: patchPrizeCampaignByIdSchema, preHandler: [idPreHandler, updateBodyPreHandler], config: { auth: true } },
        patchPrizeCampaignByIdHandler
    );

    app.put(
        "/id/:id/prizes",
        {
            schema: updatePrizeCampaignPrizesByIdSchema,
            preHandler: [idPreHandler, prizesBodyPreHandler],
            config: { auth: true },
        },
        replacePrizeCampaignPrizesHandler
    );

    app.patch(
        "/id/:campaignId/prizes/:prizeId",
        { schema: patchPrizeBySubdocumentIdSchema, preHandler: [prizeParamsPreHandler, prizePatchBodyPreHandler], config: { auth: true } },
        patchPrizeBySubdocumentIdHandler
    );

    app.delete(
        "/id/:id",
        { schema: deletePrizeCampaignByIdSchema, preHandler: idPreHandler, config: { auth: true } },
        deletePrizeCampaignByIdHandler
    );
}
