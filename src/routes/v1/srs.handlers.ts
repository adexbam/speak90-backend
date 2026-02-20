import type { FastifyReply, FastifyRequest } from "fastify";
import { appendSrsReview, readSrsCards, saveSrsCards } from "../../services/srs.service.js";

type PutSrsCardsBody = {
    cards: Array<{
        cardId: string;
        box: number;
        dueAt: string;
        reviewCount: number;
        updatedAt: string;
    }>;
};

type PostSrsReviewBody = {
    cardId: string;
    result: "again" | "good" | "easy";
    reviewedAt: string;
};

function requireSubjectId(request: FastifyRequest): string {
    const subjectId = (request.user as { sub?: string } | undefined)?.sub;
    if (!subjectId) {
        throw request.server.httpErrors.unauthorized("Missing token subject");
    }
    return subjectId;
}

export async function putSrsCardsBulkHandler(
    request: FastifyRequest<{ Body: PutSrsCardsBody }>,
    reply: FastifyReply
) {
    const subjectId = requireSubjectId(request);
    const result = await saveSrsCards({
        subjectId,
        cards: request.body.cards.map((card) => ({
            cardId: card.cardId,
            box: card.box,
            dueAt: new Date(card.dueAt).toISOString(),
            reviewCount: card.reviewCount,
            updatedAt: new Date(card.updatedAt).toISOString(),
        })),
    });
    reply.code(200);
    return result;
}

export async function getSrsCardsHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const subjectId = requireSubjectId(request);
    const result = await readSrsCards(subjectId);
    reply.code(200);
    return result;
}

export async function postSrsReviewHandler(
    request: FastifyRequest<{ Body: PostSrsReviewBody }>,
    reply: FastifyReply
) {
    const subjectId = requireSubjectId(request);
    const result = await appendSrsReview({
        subjectId,
        cardId: request.body.cardId,
        result: request.body.result,
        reviewedAt: new Date(request.body.reviewedAt).toISOString(),
    });
    reply.code(201);
    return result;
}
