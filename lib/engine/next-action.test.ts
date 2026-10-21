import { describe, expect, it } from "vitest";
import type { AccountStatus } from "@/lib/engine/account-status";
import { nextAction } from "@/lib/engine/next-action";
import type { AccountSnapshot } from "@/lib/engine/portfolio";

const acct = (accountId: string, cash: number, over: Partial<AccountSnapshot> = {}): AccountSnapshot => ({
  accountId, name: accountId, brokerage: "B", cash, holdings: [], supportsTrading: true, supportsFractional: true,
  currency: "USD", currencyOk: true, reportedTotal: null, asOf: null, warnings: [], ...over,
});
const st = (s: Record<string, AccountStatus>) => s;

describe("nextAction", () => {
  it("missing targets come first: nothing can be rebalanced without them", () => {
    const r = nextAction([acct("a", 100), acct("b", 500)], st({ a: "drifted", b: "no_targets" }));
    expect(r).toMatchObject({ kind: "set_targets", others: 0 });
    expect(r.kind === "set_targets" && r.account.accountId).toBe("b");
  });

  it("counts other accounts also waiting, and picks the largest first", () => {
    const r = nextAction([acct("small", 10), acct("big", 1000)], st({ small: "no_targets", big: "no_targets" }));
    expect(r.kind === "set_targets" && r.account.accountId).toBe("big");
    expect(r.kind === "set_targets" && r.others).toBe(1);
  });

  it("invalid targets are fixed before rebalancing", () => {
    expect(nextAction([acct("a", 1), acct("b", 2)], st({ a: "drifted", b: "invalid" })).kind).toBe("fix_targets");
  });

  it("a rebalance already running takes priority: don't invite another one on top", () => {
    const r = nextAction([acct("a", 100), acct("b", 500)], st({ a: "rebalancing", b: "no_targets" }), { a: "run-1" });
    expect(r).toMatchObject({ kind: "in_progress", runId: "run-1" });
  });

  it("drifted -> rebalance", () => {
    const r = nextAction([acct("a", 1)], st({ a: "drifted" }));
    expect(r.kind).toBe("rebalance");
  });

  it("everything on target -> all_good", () => {
    expect(nextAction([acct("a", 1), acct("b", 2)], st({ a: "on_target", b: "on_target" }))).toEqual({ kind: "all_good" });
  });

  it("no accounts, or only accounts we can't rebalance -> all_good (nothing to nag about)", () => {
    expect(nextAction([], {}).kind).toBe("all_good");
    expect(nextAction([acct("x", 5, { currencyOk: false })], st({ x: "no_targets" })).kind).toBe("all_good");
  });
});
