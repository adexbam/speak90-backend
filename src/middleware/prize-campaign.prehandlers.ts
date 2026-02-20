import type { FastifyInstance } from "fastify";
import type {
    CreatePrizeCampaignInput,
    UpdatePrizeCampaignInput,
} from "../controllers/prize-campaign.controller.js";
import { validateYearType } from "../services/prize-campaign.validation.js";
import { parsePagination } from "../utils/pagination.js";
import type {
    IdParams,
    PaginationParams,
    PrizeParams,
    YearTypeParams,
} from "../types/prize-campaign.http.js";

export const paginationPreHandler =
    (app: FastifyInstance) => async (request: any) => {
        const { limit, offset } = request.query as {
            limit?: number | string;
            offset?: number | string;
        };
        try {
            request.pagination = parsePagination(limit, offset);
        } catch (error) {
            throw app.httpErrors.badRequest(
                error instanceof Error
                    ? error.message
                    : "limit/offset must be numbers"
            );
        }
    };

export const yearTypePreHandler = async (request: any) => {
    const { year, type } = request.params as YearTypeParams;
    request.yearType = validateYearType(request.server, year, type);
};

export const idPreHandler = async (request: any) => {
    request.prizeCampaignId = (request.params as IdParams).id;
};

export const prizeParamsPreHandler = async (request: any) => {
    const { campaignId, prizeId } = request.params as PrizeParams;
    request.prizeParams = { campaignId, prizeId };
};

export const createBodyPreHandler = async (request: any) => {
    request.createInput = request.body as CreatePrizeCampaignInput;
};

export const updateBodyPreHandler = async (request: any) => {
    request.updateInput = request.body as UpdatePrizeCampaignInput;
};

export const prizesBodyPreHandler = async (request: any) => {
    const { prizes } = request.body as {
        prizes: UpdatePrizeCampaignInput["prizes"];
    };
    request.prizesInput = prizes || [];
};

export const prizePatchBodyPreHandler = async (request: any) => {
    request.prizeUpdateInput = request.body as {
        id?: number;
        date?: string;
        prize?: string;
        headline?: string;
        description?: string;
        article_link?: string;
        image_url_vertical?: string;
        image_url_horizontal?: string;
        logo?: string;
        logo_url?: string;
        Anmerkungen?: string;
        is_bild_plus?: boolean;
    };
};
