import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { accountSettings, targets as targetsTable } from "@/lib/db/schema";
import { CASH, targetsProblem, type Targets } from "@/lib/engine/drift";
import type { TargetMode } from "@/lib/engine/exposure-targets";
import { canonicalSymbol } from "@/lib/snaptrade/normalize";

export type Settings = { driftBandPct: number; cashBufferPct: number; targetMode: TargetMode };
const DEFAULT_SETTINGS: Settings = { driftBandPct: 3, cashBufferPct: 0.5, targetMode: "direct" };

const symbol = z
  .string()
  .transform((s) => (s.trim().toUpperCase() === CASH ? CASH : canonicalSymbol(s)))
  .refine((s) => /^[A-Z0-9][A-Z0-9.]{0,11}$/.test(s), "Use a ticker like VOO or BRK.B.");

export const targetsBodySchema = z.object({
  targets: z
    .array(z.object({ symbol, pct: z.number().finite() }))
    .max(50)
    .transform((rows, ctx) => {
      const out: Targets = {};
      for (const { symbol: s, pct } of rows) {
        if (s in out) ctx.addIssue({ code: "custom", message: `${s} is listed twice.` });
        out[s] = pct;
      }
      return out;
    }),
  driftBandPct: z.number().min(0).max(50),
  cashBufferPct: z.number().min(0).max(50),
  targetMode: z.enum(["direct", "exposure"]).default("direct"),
});

type TargetsBody = z.infer<typeof targetsBodySchema>;

/**
 * Same rule the engine enforces, as a validation error for the API.
 * In "exposure" mode a stock's target counts what the ETFs already hold, so the typed numbers legitimately add up
 * differently from the direct holdings; there only the per-target bounds are checked here, and the sum is checked
 * by the plan once ETF weights are known (and by the editor, which can see them).
 */
export const bodyProblem = (b: TargetsBody) => {
  if (b.targetMode === "exposure") {
    if (Object.keys(b.targets).length === 0) return "Add at least one target.";
    const bad = Object.entries(b.targets).find(([, pct]) => pct < 0 || pct > 100);
    return bad ? `${bad[0]}: a target must be between 0% and 100%.` : null;
  }
  return targetsProblem(b.targets);
};

export async function getTargets(userId: string, accountId: string) {
  const [rows, [settings]] = await Promise.all([
    db.select().from(targetsTable).where(and(eq(targetsTable.userId, userId), eq(targetsTable.accountId, accountId))),
    db.select().from(accountSettings).where(and(eq(accountSettings.userId, userId), eq(accountSettings.accountId, accountId))),
  ]);
  return {
    targets: Object.fromEntries(rows.map((r) => [r.symbol, r.targetPct])) as Targets,
    settings: settings ? { driftBandPct: settings.driftBandPct, cashBufferPct: settings.cashBufferPct, targetMode: settings.targetMode } : DEFAULT_SETTINGS,
  };
}

/** Replaces the account's targets and settings in one transaction. */
export async function saveTargets(userId: string, accountId: string, body: TargetsBody) {
  await db.transaction(async (tx) => {
    await tx.delete(targetsTable).where(and(eq(targetsTable.userId, userId), eq(targetsTable.accountId, accountId)));
    const rows = Object.entries(body.targets).map(([symbol, targetPct]) => ({ userId, accountId, symbol, targetPct }));
    if (rows.length) await tx.insert(targetsTable).values(rows);
    const settings = { userId, accountId, driftBandPct: body.driftBandPct, cashBufferPct: body.cashBufferPct, targetMode: body.targetMode };
    await tx.insert(accountSettings).values(settings).onConflictDoUpdate({ target: [accountSettings.userId, accountSettings.accountId], set: settings });
  });
}
