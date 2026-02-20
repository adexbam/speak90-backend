import { PrizeCampaignModel } from "../db/models/prize-campaign.js";

export async function findPrizeCampaignByYearAndType(
    year: string,
    type: string
) {
    return PrizeCampaignModel.findOne({ year, type }).lean();
}

export async function listPrizeCampaignsByYearAndType(
    year: string,
    type: string
) {
    return PrizeCampaignModel.find({ year, type }).lean();
}

export async function listPrizeCampaigns() {
    return PrizeCampaignModel.find({}).lean();
}

export async function findPrizeCampaignById(id: string) {
    return PrizeCampaignModel.findById(id).lean();
}

export async function createPrizeCampaign(input: {
    name: string;
    year: string;
    type: "easter" | "advent";
    prizes: unknown[];
    status: string;
    daviz?: {
        davizUrlId?: string;
        davizUrl?: string;
        kicker?: string;
        headline?: string;
        subline?: string;
    };
}) {
    const doc = await PrizeCampaignModel.create(input);
    return doc.toObject();
}

export async function updatePrizeCampaignByYearAndType(
    year: string,
    type: "easter" | "advent",
    update: {
        name?: string;
        prizes?: unknown[];
        status?: string;
    },
    isPatch = true
) {
    const payload = isPatch ? update : { ...update, year, type };
    return PrizeCampaignModel.findOneAndUpdate({ year, type }, payload, {
        new: true,
        runValidators: true,
    }).lean();
}

export async function deletePrizeCampaignByYearAndType(
    year: string,
    type: "easter" | "advent"
) {
    return PrizeCampaignModel.findOneAndDelete({ year, type }).lean();
}

export async function updatePrizeCampaignById(
    id: string,
    update: {
        name?: string;
        year?: string;
        type?: "easter" | "advent";
        prizes?: unknown[];
        status?: string;
        daviz?: {
            davizUrlId?: string;
            davizUrl?: string;
            kicker?: string;
            headline?: string;
            subline?: string;
        };
    }
) {
    return PrizeCampaignModel.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
    }).lean();
}

export async function deletePrizeCampaignById(id: string) {
    return PrizeCampaignModel.findByIdAndDelete(id).lean();
}

export async function updatePrizeSubdocumentById(
    campaignId: string,
    prizeId: string,
    update: Record<string, unknown>
) {
    const setPayload: Record<string, unknown> = {};
    const allowedFields = new Set([
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
    ]);
    for (const [key, value] of Object.entries(update)) {
        if (!allowedFields.has(key)) continue;
        setPayload[`prizes.$.${key}`] = value;
    }

    return PrizeCampaignModel.findOneAndUpdate(
        { _id: campaignId, "prizes._id": prizeId },
        { $set: setPayload },
        { new: true, runValidators: true }
    ).lean();
}

export async function listPrizeCampaignsPagination(
    limit: number,
    skip: number
) {
    return PrizeCampaignModel.find({}).skip(skip).limit(limit).lean();
}

export async function listPrizeCampaignsByYearAndTypePagination(
    year: string,
    type: string,
    limit: number,
    skip: number
) {
    return PrizeCampaignModel.find({ year, type })
        .skip(skip)
        .limit(limit)
        .lean();
}
