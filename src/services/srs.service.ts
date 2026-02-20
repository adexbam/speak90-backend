import {
    insertSrsReview,
    listSrsCards,
    upsertSrsCardsLww,
    type SrsCardInput,
} from "../repositories/srs.repository.js";

export async function saveSrsCards(params: {
    subjectId: string;
    cards: SrsCardInput[];
}) {
    await upsertSrsCardsLww(params);
    const cards = await listSrsCards(params.subjectId);
    return { cards };
}

export async function readSrsCards(subjectId: string) {
    const cards = await listSrsCards(subjectId);
    return { cards };
}

export async function appendSrsReview(params: {
    subjectId: string;
    cardId: string;
    result: "again" | "good" | "easy";
    reviewedAt: string;
}) {
    return insertSrsReview({
        subjectId: params.subjectId,
        cardId: params.cardId,
        result: params.result,
        reviewedAt: params.reviewedAt,
    });
}
