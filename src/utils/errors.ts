export interface AppError {
    message: string;
    statusCode: number;
    errorCode?: string;
    isOperational: boolean;
}

export interface ErrorResponse {
    error: string;
    code?: string;
    status: number;
    timestamp: string;
    path?: string;
    details: unknown;
}

export const createError = (
    message: string,
    statusCode: number,
    errorCode?: string,
    isOperational = true
): AppError => ({
    message,
    statusCode,
    errorCode,
    isOperational,
});

export const createValidationError = (
    message: string,
    errorCode?: string
): AppError => createError(message, 400, errorCode || "VALIDATION_ERROR");

export const createNotFoundError = (
    resource: string,
    id?: string | number
): AppError => {
    const message = id
        ? `${resource} with id ${id} not found`
        : `${resource} not found`;
    return createError(message, 404, "RESOURCE_NOT_FOUND");
};

export const createConflictError = (
    message: string,
    errorCode?: string
): AppError => createError(message, 409, errorCode || "CONFLICT");

export const createDatabaseError = (message: string): AppError =>
    createError(
        `Database operation failed: ${message}`,
        500,
        "DATABASE_ERROR",
        false
    );

export const createAuthError = (
    message: string,
    errorCode?: string
): AppError => createError(message, 401, errorCode || "AUTH_ERROR");

export const formatErrorResponse = (
    error: AppError,
    path?: string
): ErrorResponse => ({
    error: error.message,
    code: error.errorCode,
    status: error.statusCode,
    timestamp: new Date().toISOString(),
    path,
    details: [],
});

export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
} as const;
