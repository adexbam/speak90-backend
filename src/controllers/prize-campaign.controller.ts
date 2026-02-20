import {
    createPrizeCampaignDocument,
    deletePrizeCampaignDocumentById,
    deletePrizeCampaignDocumentByYearAndType,
    getAllPrizeCampaigns,
    getPrizeCampaignById,
    getPrizeCampaignByYearAndType,
    getPrizeCampaignsByYearAndType,
    getPrizeCampaignsByYearAndTypePagination,
    getPrizeCampaignsPagination,
    updatePrizeBySubdocumentId,
    updatePrizeCampaignDocumentById,
    updatePrizeCampaignDocumentByYearAndType,
    updatePrizeCampaignPrizesById,
    type CreatePrizeCampaignInput,
    type UpdatePrizeCampaignInput,
    type UpdatePrizeSubdocumentInput,
} from "../services/prize-campaign.service.js";

export {
    createPrizeCampaignDocument,
    deletePrizeCampaignDocumentById,
    deletePrizeCampaignDocumentByYearAndType,
    getAllPrizeCampaigns,
    getPrizeCampaignById,
    getPrizeCampaignByYearAndType,
    getPrizeCampaignsByYearAndType,
    getPrizeCampaignsByYearAndTypePagination,
    getPrizeCampaignsPagination,
    updatePrizeBySubdocumentId,
    updatePrizeCampaignDocumentById,
    updatePrizeCampaignDocumentByYearAndType,
    updatePrizeCampaignPrizesById,
};

export type {
    CreatePrizeCampaignInput,
    UpdatePrizeCampaignInput,
    UpdatePrizeSubdocumentInput,
};
