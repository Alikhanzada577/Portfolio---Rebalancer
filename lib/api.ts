import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { InvalidTargetsError } from "@/lib/engine/drift";
import { env } from "@/lib/env";
import { ReauthRequired } from "@/lib/oauth/tokens";
import { AccountNotFoundError } from "@/lib/portfolio";
import { ExecutionConflictError, NoTargetsError, PreviewExpiredError, RunInProgressError, RunNotFoundError } from "@/lib/rebalance/errors";
import { getSession } from "@/lib/session";
import { SnapTradeError } from "@/lib/snaptrade/client";

const json = (body: Record<string, unknown>, status: number) => NextResponse.json(body, { status });

export const uuidParam = z.uuid();

/** Maps known failures to HTTP responses with messages safe to show to the user. */
function toResponse(err: unknown) {
  if (err instanceof ReauthRequired) return json({ error: "reauth_required", message: "Please sign in again." }, 401);
  if (err instanceof z.ZodError) return json({ error: "invalid_request", message: err.issues[0]?.message ?? "Invalid request." }, 400);
  if (err instanceof InvalidTargetsError) return json({ error: "invalid_targets", message: err.message }, 400);
  if (err instanceof NoTargetsError) return json({ error: "no_targets", message: "Set targets for this account first." }, 400);
  if (err instanceof AccountNotFoundError || err instanceof RunNotFoundError) return json({ error: "not_found", message: "Not found." }, 404);
  if (err instanceof ExecutionConflictError) return json({ error: "conflict", status: err.runStatus, message: "This rebalance was already started." }, 409);
  if (err instanceof RunInProgressError) return json({ error: "run_in_progress", runId: err.runId, message: "A rebalance for this account is still in progress. Wait for it to finish before starting another." }, 409);
  if (err instanceof PreviewExpiredError) return json({ error: "preview_expired", message: "This preview is more than 5 minutes old and prices may have moved. Run a new preview." }, 410);
  if (err instanceof SnapTradeError) return json({ error: "snaptrade_error", message: err.status === 429 ? "SnapTrade is rate limiting requests. Wait a minute and try again." : "SnapTrade couldn't complete that request. Please try again." }, 502);
  console.error("api: unexpected error", err instanceof Error ? err.name : "unknown");
  return json({ error: "server_error", message: "Something went wrong. Please try again." }, 500);
}

/**
 * Wraps a route handler: requires a signed-in session, rejects cross-origin writes, and turns known
 * errors into JSON responses. The handler only ever runs for an authenticated user.
 */
export function route<C>(handler: (req: Request, userId: string, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    try {
      const { userId } = await getSession();
      if (!userId) return json({ error: "unauthenticated", message: "Please sign in." }, 401);
      if (req.method !== "GET") {
        const origin = req.headers.get("origin");
        if (origin && origin !== new URL(env.APP_BASE_URL).origin) return json({ error: "forbidden", message: "Cross-origin request blocked." }, 403);
      }
      return await handler(req, userId, ctx);
    } catch (err) {
      return toResponse(err);
    }
  };
}
