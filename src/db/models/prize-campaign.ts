import mongoose, { Schema } from "mongoose";

export interface PrizeEntry {
    id: number;
    date: string;
    prize: string;
    headline: string;
    description: string;
    article_link: string;
    image_url_vertical: string;
    image_url_horizontal: string;
    logo: string;
    logo_url: string;
    Anmerkungen: string;
    is_bild_plus: boolean;
}

export interface PrizeCampaignDocument {
	_id: string;
	name: string;
	year: string;
	type: string;
	prizes: PrizeEntry[];
	status: string;
	daviz?: {
		davizUrlId?: string;
		davizUrl?: string;
		kicker?: string;
		headline?: string;
		subline?: string;
	};
}

const PrizeSchema = new Schema<PrizeEntry>({
    id: { type: Number, required: true },
    date: { type: String, required: true },
    prize: { type: String, required: true },
    headline: { type: String, required: true },
    description: { type: String, required: true },
    article_link: { type: String, required: true },
    image_url_vertical: { type: String, required: true },
    image_url_horizontal: { type: String, required: true },
    logo: { type: String, required: true },
    logo_url: { type: String, required: true },
    Anmerkungen: { type: String, default: "" },
    is_bild_plus: { type: Boolean, required: true },
});

const PrizeCampaignSchema = new Schema<PrizeCampaignDocument>(
	{
		name: { type: String, required: true },
		year: { type: String, required: true },
        type: { type: String, required: true, enum: ["easter", "advent"] },
        prizes: { type: [PrizeSchema], default: [] },
        status: { type: String, required: true },
        daviz: {
            davizUrlId: { type: String },
            davizUrl: { type: String },
            kicker: { type: String },
            headline: { type: String },
            subline: { type: String },
        },
    },
    {
        collection: "prices",
    }
);

PrizeCampaignSchema.index({ year: 1, type: 1 });

export const PrizeCampaignModel =
    mongoose.models.PrizeCampaign ||
    mongoose.model<PrizeCampaignDocument>("PrizeCampaign", PrizeCampaignSchema);
