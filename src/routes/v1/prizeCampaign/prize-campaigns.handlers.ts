import type { FastifyReply, FastifyRequest } from "fastify";
import {
    createPrizeCampaignDocument,
    deletePrizeCampaignDocumentById,
    getAllPrizeCampaigns,
    getPrizeCampaignById,
    getPrizeCampaignsByYearAndType,
    getPrizeCampaignsByYearAndTypePagination,
    getPrizeCampaignsPagination,
    updatePrizeBySubdocumentId,
    updatePrizeCampaignDocumentById,
    updatePrizeCampaignPrizesById,
    type CreatePrizeCampaignInput,
    type UpdatePrizeCampaignInput,
} from "../../../controllers/prize-campaign.controller.js";
import { logEvent } from "../../../utils/logger.js";
import type {
    PaginationParams,
    PrizeParams,
    YearTypeParams,
} from "../../../types/prize-campaign.http.js";

export async function listPrizeCampaignsHandler(request: FastifyRequest) {
    const items = await getAllPrizeCampaigns();
    logEvent(
        request.log,
        "prize_campaign.listed",
        { data: { count: items.length } },
        "Prize campaigns listed"
    );
    return items;
}

export async function listPrizeCampaignsPaginatedHandler(
    request: FastifyRequest
) {
    const { limit, offset } = request.pagination as PaginationParams;
    const items = await getPrizeCampaignsPagination(limit, offset);
    logEvent(
        request.log,
        "prize_campaign.listed_paginated",
        { data: { count: items.length, limit, offset } },
        "Prize campaigns listed with pagination"
    );
    return items;
}

export async function createPrizeCampaignHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const created = await createPrizeCampaignDocument(
        request.createInput as CreatePrizeCampaignInput
    );
    logEvent(
        request.log,
        "prize_campaign.created",
        {
            data: {
                id: created._id?.toString?.() ?? created._id,
                year: created.year,
                type: created.type,
            },
        },
        "Prize campaign created"
    );
    reply.code(201);
    return created;
}

export async function listPrizeCampaignsByYearTypeHandler(
    request: FastifyRequest
) {
    const { year, type } = request.yearType as YearTypeParams;
    const items = await getPrizeCampaignsByYearAndType(year, type);
    logEvent(
        request.log,
        "prize_campaign.listed_by_year_type",
        { data: { year, type, count: items.length } },
        "Prize campaigns listed by year and type"
    );
    return items;
}

export async function listPrizeCampaignsByYearTypePaginatedHandler(
    request: FastifyRequest
) {
    const { year, type } = request.yearType as YearTypeParams;
    const { limit, offset } = request.pagination as PaginationParams;
    const items = await getPrizeCampaignsByYearAndTypePagination(
        year,
        type,
        limit,
        offset
    );
    logEvent(
        request.log,
        "prize_campaign.listed_by_year_type_paginated",
        { data: { year, type, count: items.length, limit, offset } },
        "Prize campaigns listed by year and type with pagination"
    );
    return items;
}

export async function getPrizeCampaignByIdHandler(request: FastifyRequest) {
    const id = request.prizeCampaignId as string;
    const item = await getPrizeCampaignById(id);
    logEvent(
        request.log,
        "prize_campaign.fetched",
        { data: { id } },
        "Prize campaign fetched"
    );
    return item;
}

export async function updatePrizeCampaignByIdHandler(request: FastifyRequest) {
    const id = request.prizeCampaignId as string;
    const updated = await updatePrizeCampaignDocumentById(
        id,
        request.updateInput as UpdatePrizeCampaignInput
    );
    logEvent(
        request.log,
        "prize_campaign.updated",
        { data: { id, fields: Object.keys(request.updateInput as object) } },
        "Prize campaign updated"
    );
    return updated;
}

export async function patchPrizeCampaignByIdHandler(request: FastifyRequest) {
    const id = request.prizeCampaignId as string;
    const updated = await updatePrizeCampaignDocumentById(
        id,
        request.updateInput as UpdatePrizeCampaignInput
    );
    logEvent(
        request.log,
        "prize_campaign.patched",
        { data: { id, fields: Object.keys(request.updateInput as object) } },
        "Prize campaign patched"
    );
    return updated;
}

export async function replacePrizeCampaignPrizesHandler(
    request: FastifyRequest
) {
    const id = request.prizeCampaignId as string;
    const prizes = request.prizesInput as UpdatePrizeCampaignInput["prizes"];
    const updated = await updatePrizeCampaignPrizesById(id, prizes || []);
    logEvent(
        request.log,
        "prize_campaign.prizes.replaced",
        { data: { id, count: (prizes || []).length } },
        "Prize campaign prizes replaced"
    );
    return updated;
}

export async function patchPrizeBySubdocumentIdHandler(
    request: FastifyRequest
) {
    const { campaignId, prizeId } = request.prizeParams as PrizeParams;
    const updated = await updatePrizeBySubdocumentId(
        campaignId,
        prizeId,
        request.prizeUpdateInput as Record<string, unknown>
    );
    logEvent(
        request.log,
        "prize_campaign.prize.updated",
        {
            data: {
                campaign_id: campaignId,
                prize_id: prizeId,
                fields: Object.keys(request.prizeUpdateInput as object),
            },
        },
        "Prize campaign prize updated"
    );
    return updated;
}

export async function deletePrizeCampaignByIdHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const id = request.prizeCampaignId as string;
    await deletePrizeCampaignDocumentById(id);
    logEvent(
        request.log,
        "prize_campaign.deleted",
        { data: { id } },
        "Prize campaign deleted"
    );
    reply.code(200).send({ deleted: true, id });
}
