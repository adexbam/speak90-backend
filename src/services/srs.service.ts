import {
    insertSrsReview,
    listSrsCards,
    upsertSrsCardsLww,
    type SrsCardInput,
} from "../repositories/srs.repository.js";

function dedupeCardsByIdLww(cards: SrsCardInput[]): SrsCardInput[] {
    const indexByCardId = new Map<string, SrsCardInput>();
    for (const card of cards) {
        const existing = indexByCardId.get(card.cardId);
        if (!existing) {
            indexByCardId.set(card.cardId, card);
            continue;
        }

        const nextTs = new Date(card.updatedAt).getTime();
        const currentTs = new Date(existing.updatedAt).getTime();
        if (nextTs >= currentTs) {
            indexByCardId.set(card.cardId, card);
        }
    }
    return [...indexByCardId.values()];
}

export async function saveSrsCards(params: {
    subjectId: string;
    cards: SrsCardInput[];
}) {
    const dedupedCards = dedupeCardsByIdLww(params.cards);
    await upsertSrsCardsLww({
        subjectId: params.subjectId,
        cards: dedupedCards,
    });
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
