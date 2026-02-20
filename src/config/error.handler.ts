import type {
    FastifyError,
    FastifyInstance,
    FastifyReply,
    FastifyRequest,
} from "fastify";
import type { AppError, ErrorResponse } from "../utils/errors.js";
import { formatErrorResponse, HTTP_STATUS } from "../utils/errors.js";
import { logEvent } from "../utils/logger.js";

const isAppError = (error: unknown): error is AppError => {
    return (
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        "isOperational" in error
    );
};

const isMongooseError = (error: FastifyError): boolean => {
    return (
        error.message?.includes("duplicate key") ||
        error.message?.includes("validation failed") ||
        error.message?.includes("Cast to ObjectId failed")
    );
};

const handleMongooseError = (error: FastifyError): AppError => {
    if (error.message?.includes("duplicate key")) {
        return {
            message: "Resource already exists",
            statusCode: HTTP_STATUS.CONFLICT,
            errorCode: "DUPLICATE_KEY",
            isOperational: true,
        };
    }

    if (error.message?.includes("validation failed")) {
        return {
            message: "Validation failed",
            statusCode: HTTP_STATUS.BAD_REQUEST,
            errorCode: "VALIDATION_ERROR",
            isOperational: true,
        };
    }

    if (error.message?.includes("Cast to ObjectId failed")) {
        return {
            message: "Invalid ID format",
            statusCode: HTTP_STATUS.BAD_REQUEST,
            errorCode: "INVALID_ID",
            isOperational: true,
        };
    }

    return {
        message: "Database operation failed",
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        errorCode: "DATABASE_ERROR",
        isOperational: true,
    };
};

const extractMongooseValidationDetails = (error: FastifyError) => {
    const anyError = error as unknown as {
        name?: string;
        errors?: Record<
            string,
            { path?: string; message?: string; kind?: string; value?: unknown }
        >;
        keyValue?: Record<string, unknown>;
        keyPattern?: Record<string, unknown>;
    };

    if (anyError.name !== "ValidationError" || !anyError.errors) {
        if (anyError.keyValue || anyError.keyPattern) {
            return {
                duplicate: true,
                key: anyError.keyValue || anyError.keyPattern,
            };
        }
        return undefined;
    }

    return Object.values(anyError.errors).map((detail) => ({
        path: detail.path,
        message: detail.message,
        kind: detail.kind,
        value: detail.value,
    }));
};

export const errorHandler = (
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
): void => {
    const logger = request.log;
    const requestId = request.requestContext?.requestId;
    const now = new Date().toISOString();

    // Handle operational errors (expected errors)
    if (isAppError(error)) {
        logEvent(
            logger,
            "error.operational",
            {
                request_id: requestId,
                error: {
                    type: "AppError",
                    message: error.message,
                },
                data: {
                    error_code: error.errorCode,
                },
            },
            "Operational error"
        );
        const response: ErrorResponse = {
            ...formatErrorResponse(error, request.url),
            status: error.statusCode,
            timestamp: now,
            details: [],
        };
        reply.status(error.statusCode).send(response);
        return;
    }

    // Handle Mongoose/database errors
    if (isMongooseError(error)) {
        const appError = handleMongooseError(error);
        const details = extractMongooseValidationDetails(error);
        logEvent(
            logger,
            "error.database",
            {
                request_id: requestId,
                error: {
                    type: "DatabaseError",
                    message: error.message,
                },
                data: {
                    error_code: appError.errorCode,
                },
            },
            "Database error"
        );
        const response: ErrorResponse = {
            ...formatErrorResponse(appError, request.url),
            status: appError.statusCode,
            timestamp: now,
            details: details ?? [],
        };
        reply.status(appError.statusCode).send(response);
        return;
    }

    // Handle Fastify validation errors
    if (error.validation) {
        logEvent(
            logger,
            "error.validation",
            {
                request_id: requestId,
                error: {
                    type: "ValidationError",
                    message: "Validation failed",
                },
                data: {
                    validation: error.validation,
                },
            },
            "Validation error"
        );
        const response: ErrorResponse = {
            error: "Validation failed",
            code: "VALIDATION_ERROR",
            status: HTTP_STATUS.BAD_REQUEST,
            timestamp: now,
            path: request.url,
            details: error.validation ?? [],
        };
        reply.status(HTTP_STATUS.BAD_REQUEST).send(response);
        return;
    }

    // Handle Fastify httpErrors (e.g., badRequest, unauthorized)
    if (typeof (error as any).statusCode === "number") {
        const statusCode = (error as any).statusCode as number;
        const errorCode =
            (error as any).code ||
            (statusCode === HTTP_STATUS.BAD_REQUEST
                ? "BAD_REQUEST"
                : "HTTP_ERROR");
        logEvent(
            logger,
            "error.operational",
            {
                request_id: requestId,
                error: {
                    type: error.name || "HttpError",
                    message: error.message,
                },
                data: {
                    error_code: errorCode,
                },
            },
            "Operational error"
        );
        const response: ErrorResponse = {
            error: error.message || "Request failed",
            code: errorCode,
            status: statusCode,
            timestamp: now,
            path: request.url,
            details: ((error as any).details as unknown[]) ?? [],
        };
        reply.status(statusCode).send(response);
        return;
    }

    // Handle JWT errors
    if (error.message?.includes("jwt") || error.message?.includes("token")) {
        logEvent(
            logger,
            "error.authentication",
            {
                request_id: requestId,
                error: {
                    type: "AuthenticationError",
                    message: error.message,
                },
            },
            "Authentication error"
        );
        const response: ErrorResponse = {
            error: "Authentication failed",
            code: "AUTH_ERROR",
            status: HTTP_STATUS.UNAUTHORIZED,
            timestamp: now,
            path: request.url,
            details: [],
        };
        reply.status(HTTP_STATUS.UNAUTHORIZED).send(response);
        return;
    }

    // Handle unexpected errors
    logEvent(
        logger,
        "error.unexpected",
        {
            request_id: requestId,
            http: {
                method: request.method,
                path: request.url,
            },
            error: {
                type: error.name || "Error",
                message: error.message,
                stack: error.stack,
            },
        },
        "Unexpected error"
    );

    const response: ErrorResponse = {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        timestamp: now,
        path: request.url,
        details: [],
    };

    reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(response);
};

export const registerErrorHandler = (app: FastifyInstance): void => {
    app.setErrorHandler(errorHandler);
    app.setNotFoundHandler((request, reply) => {
        const response: ErrorResponse = {
            error: "Route not found",
            code: "ROUTE_NOT_FOUND",
            status: HTTP_STATUS.NOT_FOUND,
            timestamp: new Date().toISOString(),
            path: request.url,
            details: [],
        };
        reply.status(HTTP_STATUS.NOT_FOUND).send(response);
    });
};
