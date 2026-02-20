import { getDbPool } from "../db/client.js";

export type SrsCardInput = {
    cardId: string;
    box: number;
    dueAt: string;
    reviewCount: number;
    updatedAt: string;
};

export type SrsCardRecord = {
    cardId: string;
    box: number;
    dueAt: string | null;
    reviewCount: number;
    updatedAt: string;
};

export type SrsReviewRecord = {
    reviewId: string;
    cardId: string;
    result: string;
    reviewedAt: string;
    createdAt: string;
};

export async function upsertSrsCardsLww(params: {
    subjectId: string;
    cards: SrsCardInput[];
}): Promise<void> {
    if (params.cards.length === 0) {
        return;
    }

    const pool = getDbPool();
    const serializedCards = params.cards.map((card) => ({
        card_id: card.cardId,
        box: card.box,
        due_at: card.dueAt,
        review_count: card.reviewCount,
        updated_at: card.updatedAt,
    }));

    await pool.query(
        `
        INSERT INTO srs_cards (
            subject_id,
            card_id,
            box,
            due_at,
            review_count,
            updated_at
        )
        SELECT
            $1,
            x.card_id,
            x.box,
            x.due_at,
            x.review_count,
            x.updated_at
        FROM jsonb_to_recordset($2::jsonb) AS x(
            card_id text,
            box int,
            due_at timestamptz,
            review_count int,
            updated_at timestamptz
        )
        ON CONFLICT (subject_id, card_id) DO UPDATE
        SET
            box = EXCLUDED.box,
            due_at = EXCLUDED.due_at,
            review_count = EXCLUDED.review_count,
            updated_at = EXCLUDED.updated_at
        WHERE srs_cards.updated_at <= EXCLUDED.updated_at
        `,
        [params.subjectId, JSON.stringify(serializedCards)]
    );
}

export async function listSrsCards(subjectId: string): Promise<SrsCardRecord[]> {
    const pool = getDbPool();
    const result = await pool.query<{
        card_id: string;
        box: number;
        due_at: string | null;
        review_count: number;
        updated_at: string;
    }>(
        `
        SELECT card_id, box, due_at, review_count, updated_at
        FROM srs_cards
        WHERE subject_id = $1
        ORDER BY due_at NULLS LAST, updated_at DESC
        `,
        [subjectId]
    );

    return result.rows.map((row) => ({
        cardId: row.card_id,
        box: row.box,
        dueAt: row.due_at ? new Date(row.due_at).toISOString() : null,
        reviewCount: row.review_count,
        updatedAt: new Date(row.updated_at).toISOString(),
    }));
}

export async function insertSrsReview(params: {
    subjectId: string;
    cardId: string;
    result: string;
    reviewedAt: string;
}): Promise<SrsReviewRecord> {
    const pool = getDbPool();
    const inserted = await pool.query<{
        id: string;
        card_id: string;
        result: string;
        reviewed_at: string;
        created_at: string;
    }>(
        `
        INSERT INTO srs_reviews (subject_id, card_id, result, reviewed_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id, card_id, result, reviewed_at, created_at
        `,
        [params.subjectId, params.cardId, params.result, params.reviewedAt]
    );

    const row = inserted.rows[0];
    return {
        reviewId: row.id,
        cardId: row.card_id,
        result: row.result,
        reviewedAt: new Date(row.reviewed_at).toISOString(),
        createdAt: new Date(row.created_at).toISOString(),
    };
}
