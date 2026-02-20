import type { FastifyReply, FastifyRequest } from "fastify";
import type {
    CreatePrizeCampaignInput,
    UpdatePrizeCampaignInput,
} from "../controllers/prize-campaign.controller.js";
import type {
    PaginationParams,
    PrizeParams,
    YearTypeParams,
} from "./prize-campaign.http.js";

declare module "fastify" {
    interface FastifyInstance {
        verifyToken: (
            request: FastifyRequest,
            reply: FastifyReply
        ) => Promise<void>;
    }

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
        pagination?: PaginationParams;
        yearType?: YearTypeParams;
        prizeCampaignId?: string;
        prizeParams?: PrizeParams;
        createInput?: CreatePrizeCampaignInput;
        updateInput?: UpdatePrizeCampaignInput;
        prizesInput?: UpdatePrizeCampaignInput["prizes"];
        prizeUpdateInput?: {
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
        uploadFolder?: string;
    }

    interface FastifyContextConfig {
        public?: boolean;
        auth?: boolean;
    }
}
