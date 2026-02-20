import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContext = {
    requestId?: string;
    durationMs?: number;
    http?: {
        method?: string;
        path?: string;
        route?: string | undefined;
        status?: number;
        user_agent?: string | undefined;
        client_ip?: string;
    };
    user?: {
        id?: string | number;
    };
};

const storage = new AsyncLocalStorage<RequestContext>();

export function initRequestContext(context: RequestContext): void {
    storage.enterWith(context);
}

export function getRequestContext(): RequestContext | undefined {
    return storage.getStore();
}

export function setRequestContext(update: RequestContext): void {
    const current = storage.getStore();
    if (!current) return;

    storage.enterWith({
        ...current,
        ...update,
        http: { ...(current.http || {}), ...(update.http || {}) },
        user: { ...(current.user || {}), ...(update.user || {}) },
    });
}

