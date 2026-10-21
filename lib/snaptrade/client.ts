import "server-only";
import type { z } from "zod";
import { deleteTokens, getAccessToken, ReauthRequired } from "@/lib/oauth/tokens";

const API_BASE = "https://api.snaptrade.com";

export class SnapTradeError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    /** The brokerage/SnapTrade's own explanation (e.g. "insufficient buying power"), when it gave one. Safe to show. */
    readonly detail?: string,
  ) {
    super(`SnapTrade ${path} failed with ${status}`);
    this.name = "SnapTradeError";
  }
}

async function errorDetail(res: Response) {
  try {
    const body: unknown = await res.json();
    if (typeof body !== "object" || body === null) return undefined;
    const b = body as Record<string, unknown>;
    const text = [b.detail, b.message, b.error].find((v): v is string => typeof v === "string");
    return text?.slice(0, 200);
  } catch {
    return undefined;
  }
}

/**
 * Bearer-only SnapTrade call (no Commercial auth fields). On 401: refresh once, retry once,
 * then give up with ReauthRequired. Logs method, path and status only.
 */
export async function snaptradeFetch<S extends z.ZodType>(
  userId: string,
  path: string,
  schema: S,
  init: { method?: string; body?: unknown } = {},
): Promise<z.infer<S>> {
  const method = init.method ?? "GET";
  const call = async (token: string) => {
    const res = await fetch(API_BASE + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(init.body !== undefined && { "Content-Type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
    console.info(`snaptrade ${method} ${path} ${res.status}`);
    return res;
  };

  let token = await getAccessToken(userId);
  let res = await call(token);
  if (res.status === 401) {
    token = await getAccessToken(userId, { rejected: token });
    res = await call(token);
    if (res.status === 401) {
      await deleteTokens(userId);
      throw new ReauthRequired();
    }
  }
  if (!res.ok) throw new SnapTradeError(res.status, path, await errorDetail(res));
  return schema.parse(await res.json());
}
