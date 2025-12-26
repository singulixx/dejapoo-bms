import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContext = {
  user?: { id: string; username: string; role: string };
  req?: { method?: string; path?: string; ip?: string; userAgent?: string };
};

export const requestContext = new AsyncLocalStorage<RequestContext>();
