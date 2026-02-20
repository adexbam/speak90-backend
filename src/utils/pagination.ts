export function parsePagination(
    limit?: number | string,
    offset?: number | string
) {
    const parsedLimit = limit === undefined ? 20 : Number(limit);
    const parsedOffset = offset === undefined ? 0 : Number(offset);

    if (Number.isNaN(parsedLimit) || Number.isNaN(parsedOffset)) {
        throw new Error("limit/offset must be numbers");
    }

    return {
        limit: Math.min(parsedLimit || 20, 100),
        offset: Math.max(parsedOffset || 0, 0),
    };
}
