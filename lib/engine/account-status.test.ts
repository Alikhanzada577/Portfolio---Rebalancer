import { describe, expect, it } from "vitest";
import { accountStatus } from "@/lib/engine/account-status";
import type { AccountSnapshot, Holding } from "@/lib/engine/portfolio";

const hold = (symbol: string, value: number): Holding => ({ accountId: "a", symbol, assetType: "etf", units: 1, price: value, value, currency: "USD" });
const acct = (cash: number, holdings: Holding[]): AccountSnapshot => ({
  accountId: "a", name: "A", brokerage: "B", cash, holdings, supportsTrading: true, supportsFractional: true,
  currency: "USD", currencyOk: true, reportedTotal: null, asOf: null, warnings: [],
});

describe("accountStatus", () => {
  it("no targets saved -> no_targets", () => expect(accountStatus(acct(1000, []), {}, 3)).toBe("no_targets"));

  it("cash-only account with targets -> drifted (it has never been invested)", () => {
    expect(accountStatus(acct(100000, []), { VOO: 60, SPY: 40 }, 3)).toBe("drifted");
  });

  it("everything within the band -> on_target", () => {
    // 60 / 40 split with 0 cash, exactly on target.
    expect(accountStatus(acct(0, [hold("VOO", 600), hold("SPY", 400)]), { VOO: 60, SPY: 40 }, 3)).toBe("on_target");
  });

  it("a holding outside the band -> drifted", () => {
    expect(accountStatus(acct(0, [hold("VOO", 700), hold("SPY", 300)]), { VOO: 60, SPY: 40 }, 3)).toBe("drifted");
  });

  it("unallocated percent counts as cash: 70% cash target is on target when cash is 70%", () => {
    expect(accountStatus(acct(700, [hold("VOO", 200), hold("SPY", 100)]), { VOO: 20, SPY: 10 }, 3)).toBe("on_target");
  });

  it("targets over 100% -> invalid, not a crash", () => {
    expect(accountStatus(acct(1000, []), { A: 80, B: 60 }, 3)).toBe("invalid");
  });
});
