import { createNotFoundError } from "../utils/errors.js";
import {
    createPrizeCampaign,
    deletePrizeCampaignById,
    deletePrizeCampaignByYearAndType,
    findPrizeCampaignById,
    findPrizeCampaignByYearAndType,
    listPrizeCampaigns,
    listPrizeCampaignsByYearAndType,
    listPrizeCampaignsByYearAndTypePagination,
    listPrizeCampaignsPagination,
    updatePrizeCampaignById,
    updatePrizeCampaignByYearAndType,
    updatePrizeSubdocumentById,
} from "../repositories/prize-campaign.repository.js";
import type { PrizeEntry } from "../db/models/prize-campaign.js";

export interface CreatePrizeCampaignInput {
    name: string;
    year: string;
    type: "easter" | "advent";
    prizes?: PrizeEntry[];
    status: string;
    daviz?: {
        davizUrlId?: string;
        davizUrl?: string;
        kicker?: string;
        headline?: string;
        subline?: string;
    };
}

export interface UpdatePrizeCampaignInput {
    name?: string;
    year?: string;
    type?: "easter" | "advent";
    status?: string;
    prizes?: PrizeEntry[];
    daviz?: {
        davizUrlId?: string;
        davizUrl?: string;
        kicker?: string;
        headline?: string;
        subline?: string;
    };
}

export interface UpdatePrizeSubdocumentInput {
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
}

export async function getPrizeCampaignByYearAndType(
    year: string,
    type: string
) {
    const priceDoc = await findPrizeCampaignByYearAndType(year, type);

    if (!priceDoc) {
        throw createNotFoundError("PrizeCampaign", `${type}-${year}`);
    }

    return priceDoc;
}

export async function getPrizeCampaignsByYearAndType(
    year: string,
    type: string
) {
    return listPrizeCampaignsByYearAndType(year, type);
}

export async function getPrizeCampaignsPagination(limit: number, skip: number) {
    return listPrizeCampaignsPagination(limit, skip);
}

export async function getPrizeCampaignsByYearAndTypePagination(
    year: string,
    type: string,
    limit: number,
    skip: number
) {
    return listPrizeCampaignsByYearAndTypePagination(year, type, limit, skip);
}

export async function getAllPrizeCampaigns() {
    return listPrizeCampaigns();
}

export async function getPrizeCampaignById(id: string) {
    const priceDoc = await findPrizeCampaignById(id);

    if (!priceDoc) {
        throw createNotFoundError("PrizeCampaign", id);
    }

    return priceDoc;
}

export async function createPrizeCampaignDocument(
    input: CreatePrizeCampaignInput
) {
    const normalizedType = input.type.toLowerCase() as "easter" | "advent";

    return createPrizeCampaign({
        name: input.name,
        year: input.year,
        type: normalizedType,
        prizes: input.prizes || [],
        status: input.status,
        daviz: input.daviz,
    });
}

export async function updatePrizeCampaignPrizesById(
    id: string,
    prizes: PrizeEntry[]
) {
    const updated = await updatePrizeCampaignById(id, { prizes });

    if (!updated) {
        throw createNotFoundError("PrizeCampaign", id);
    }

    return updated;
}

export async function updatePrizeBySubdocumentId(
    campaignId: string,
    prizeId: string,
    input: UpdatePrizeSubdocumentInput
) {
    const updated = await updatePrizeSubdocumentById(
        campaignId,
        prizeId,
        input as Record<string, unknown>
    );

    if (!updated) {
        throw createNotFoundError("PrizeCampaign", `${campaignId}#${prizeId}`);
    }

    return updated;
}

export async function updatePrizeCampaignDocumentByYearAndType(
    year: string,
    type: "easter" | "advent",
    input: UpdatePrizeCampaignInput,
    isPatch = true
) {
    const updated = await updatePrizeCampaignByYearAndType(
        year,
        type,
        input,
        isPatch
    );

    if (!updated) {
        throw createNotFoundError("PrizeCampaign", `${type}-${year}`);
    }

    return updated;
}

export async function deletePrizeCampaignDocumentByYearAndType(
    year: string,
    type: "easter" | "advent"
) {
    const deleted = await deletePrizeCampaignByYearAndType(year, type);

    if (!deleted) {
        throw createNotFoundError("PrizeCampaign", `${type}-${year}`);
    }

    return deleted;
}

export async function updatePrizeCampaignDocumentById(
    id: string,
    input: UpdatePrizeCampaignInput
) {
    const updated = await updatePrizeCampaignById(id, input);

    if (!updated) {
        throw createNotFoundError("PrizeCampaign", id);
    }

    return updated;
}

export async function deletePrizeCampaignDocumentById(id: string) {
    const deleted = await deletePrizeCampaignById(id);

    if (!deleted) {
        throw createNotFoundError("PrizeCampaign", id);
    }

    return deleted;
}
