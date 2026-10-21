// Integration test for the execution state machine. Uses the LOCAL Postgres (skipped if unreachable) with
// SnapTrade mocked, so nothing is ever sent to a brokerage. Each test cleans up the rows it creates.
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountSnapshot } from "@/lib/engine/portfolio";
import type { RebalancePlan, Trade } from "@/lib/engine/trades";

// A local Postgres, never a real one. Override with TEST_DATABASE_URL; with no username it connects as the current OS user.
const LOCAL_DB = process.env.TEST_DATABASE_URL ?? "postgres://localhost:5432/rebalancer_dev";
const sql = postgres(LOCAL_DB, { max: 2, connect_timeout: 2 });
const available = await sql`select 1`.then(() => true, () => false);

const fake = vi.hoisted(() => ({
  placed: [] as Record<string, unknown>[],
  placeError: null as null | ((body: Record<string, unknown>) => unknown),
  statuses: new Map<string, string>(), // brokerage_order_id -> status
  recentOrdersCalls: 0,
  account: null as unknown,
}));

vi.mock("@/lib/snaptrade/client", () => {
  class SnapTradeError extends Error {
    constructor(readonly status: number, readonly path: string, readonly detail?: string) {
      super(`fake ${status}`);
    }
  }
  return {
    SnapTradeError,
    snaptradeFetch: async (_u: string, path: string, _s: unknown, init?: { body?: Record<string, unknown> }) => {
      if (path === "/trade/place") {
        const err = fake.placeError?.(init!.body!);
        if (err) throw err;
        fake.placed.push(init!.body!);
        const id = `b-${fake.placed.length}`;
        fake.statuses.set(id, "PENDING");
        return { brokerage_order_id: id, status: "PENDING" };
      }
      if (path.includes("/recentOrders")) fake.recentOrdersCalls++;
      if (path.includes("/recentOrders")) return { orders: [...fake.statuses].map(([id, status]) => ({ brokerage_order_id: id, status })) };
      throw new Error(`unexpected path ${path}`);
    },
  };
});
vi.mock("@/lib/rebalance/context", () => ({
  loadContext: async () => ({ account: fake.account, targets: { B: 100 }, settings: { driftBandPct: 3, cashBufferPct: 0 }, instruments: { B: { price: 100, assetType: "etf" } }, symbolIds: {} }),
}));

const trade = (symbol: string, side: "buy" | "sell", units: number, price: number): Trade => ({ symbol, side, units, price, estValue: units * price, assetType: "etf", executable: true });
const acct = (cash: number, holdings: AccountSnapshot["holdings"]): AccountSnapshot => ({
  accountId: "acc", name: "T", brokerage: "T", cash, holdings, supportsTrading: true, supportsFractional: true, currency: "USD", currencyOk: true, reportedTotal: null, asOf: null, warnings: [],
});
const hold = (symbol: string, units: number, price: number) => ({ accountId: "acc", symbol, assetType: "etf" as const, units, price, value: units * price, currency: "USD" });

const userId = `test-${randomUUID()}`;
let exec: typeof import("@/lib/rebalance/execute");
let errors: typeof import("@/lib/rebalance/errors");
let runs: typeof import("@/lib/rebalance/advance-runs");
let drive: typeof import("@/lib/rebalance/drive-run");
let refresh: typeof import("@/lib/rebalance/refresh-orders");
let runsRepo: typeof import("@/lib/rebalance/runs");
let preview: typeof import("@/lib/rebalance/preview");
let history: typeof import("@/lib/rebalance/history");
let targetsStore: typeof import("@/lib/targets");
let SnapTradeError: new (status: number, path: string, detail?: string) => Error;

async function makeRun(trades: Trade[], over: { createdMsAgo?: number; user?: string; account?: string } = {}) {
  const plan = { status: "rebalance", mode: "trade", message: null, base: 1000, rows: [], trades, after: [], leftoverCash: 0, unmanaged: [], warnings: [] } as RebalancePlan;
  const stored = { plan, impact: {}, symbolIds: {}, execution: { sellsSubmitted: false, buysSubmitted: false, buysSkipped: false, note: null } };
  const [r] = await sql`insert into rebalance_runs (user_id, account_id, status, plan_json, created_at)
    values (${over.user ?? userId}, ${over.account ?? `acc-${randomUUID()}`}, 'previewed', ${sql.json(stored as never)}, now() - ${(over.createdMsAgo ?? 0) + " milliseconds"}::interval) returning id`;
  return r.id as string;
}
const ageOrders = (runId: string) => sql`update rebalance_orders set updated_at = now() - interval '30 seconds' where run_id = ${runId}`;
const orders = (runId: string) => sql`select symbol, side, status, error from rebalance_orders where run_id = ${runId} order by symbol`;
const runStatus = async (runId: string) => (await sql`select status from rebalance_runs where id = ${runId}`)[0].status as string;
// A simulated fill also drops the cached order list: in production the cache simply expires within seconds.
const fill = (...ids: string[]) => {
  ids.forEach((id) => fake.statuses.set(id, "EXECUTED"));
  refresh.resetRecentOrdersCache();
};

describe.skipIf(!available)("execution state machine (local Postgres, mocked SnapTrade)", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = LOCAL_DB;
    vi.resetModules();
    exec = await import("@/lib/rebalance/execute");
    errors = await import("@/lib/rebalance/errors");
    runs = await import("@/lib/rebalance/advance-runs");
    drive = await import("@/lib/rebalance/drive-run");
    refresh = await import("@/lib/rebalance/refresh-orders");
    runsRepo = await import("@/lib/rebalance/runs");
    preview = await import("@/lib/rebalance/preview");
    history = await import("@/lib/rebalance/history");
    targetsStore = await import("@/lib/targets");
    SnapTradeError = (await import("@/lib/snaptrade/client")).SnapTradeError as never;
    await sql`insert into users (id) values (${userId})`;
  });
  afterAll(async () => {
    if (available) await sql`delete from users where id = ${userId}`; // cascades to runs and orders
    await sql.end();
  });
  beforeEach(() => {
    refresh.resetRecentOrdersCache(); // each test sets up its own brokerage statuses
    fake.placed = [];
    fake.placeError = null;
    fake.statuses = new Map();
    fake.account = acct(500, [hold("A", 5, 100)]);
  });

  it("a double click submits once: the second caller is rejected and nothing is placed twice", async () => {
    const id = await makeRun([trade("A", "sell", 5, 100), trade("B", "buy", 5, 100)]);
    const results = await Promise.allSettled([exec.startExecution(userId, id), exec.startExecution(userId, id), exec.startExecution(userId, id)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected").every((r) => (r as PromiseRejectedResult).reason instanceof errors.ExecutionConflictError)).toBe(true);
    expect(fake.placed).toHaveLength(1); // only the sell; buys wait for it to fill
    expect(fake.placed[0]).toMatchObject({ action: "SELL", symbol: "A", units: 5, order_type: "Market", time_in_force: "Day" });
    expect(await runStatus(id)).toBe("executing_sells");
  });

  it("sends the order row id as client_order_id and never sends Commercial auth fields", async () => {
    const id = await makeRun([trade("A", "sell", 5, 100)]);
    await exec.startExecution(userId, id);
    const [row] = await sql`select id from rebalance_orders where run_id = ${id}`;
    expect(fake.placed[0].client_order_id).toBe(row.id);
    for (const k of ["userId", "userSecret", "clientId", "consumerKey", "Signature"]) expect(fake.placed[0]).not.toHaveProperty(k);
  });

  it("full flow: sells first, buys only after the sells fill, recomputed from real cash, then completed", async () => {
    const id = await makeRun([trade("A", "sell", 5, 100), trade("B", "buy", 5, 100)]);
    await exec.startExecution(userId, id);
    await ageOrders(id);

    // sell still open -> nothing else happens
    let v = await exec.advanceRun(userId, id);
    expect(v.status).toBe("executing_sells");
    expect(fake.placed).toHaveLength(1);

    // sell fills; actual account now has $500 cash and no A
    fill("b-1");
    fake.account = acct(500, []);
    await ageOrders(id);
    v = await exec.advanceRun(userId, id);
    expect(fake.placed).toHaveLength(2);
    expect(fake.placed[1]).toMatchObject({ action: "BUY", symbol: "B", units: 5 }); // $500 / $100, capped at the 5 confirmed
    expect(v.status).toBe("executing_buys");

    fill("b-2");
    await ageOrders(id);
    v = await exec.advanceRun(userId, id);
    expect(v.status).toBe("completed");
    expect((await orders(id)).map((o) => o.status)).toEqual(["EXECUTED", "EXECUTED"]);
  });

  it("buys are capped at what the user confirmed, even if the account has more cash than expected", async () => {
    const id = await makeRun([trade("A", "sell", 5, 100), trade("B", "buy", 3, 100)]);
    await exec.startExecution(userId, id);
    fill("b-1");
    fake.account = acct(5000, []); // far more cash than the preview assumed
    await ageOrders(id);
    await exec.advanceRun(userId, id);
    expect(fake.placed[1]).toMatchObject({ action: "BUY", symbol: "B", units: 3 });
  });

  it("two pollers at once place the buys exactly once", async () => {
    const id = await makeRun([trade("A", "sell", 5, 100), trade("B", "buy", 5, 100)]);
    await exec.startExecution(userId, id);
    fill("b-1");
    fake.account = acct(500, []);
    await ageOrders(id);
    await Promise.all([exec.advanceRun(userId, id), exec.advanceRun(userId, id), exec.advanceRun(userId, id)]);
    expect(fake.placed.filter((p) => p.action === "BUY")).toHaveLength(1);
  });

  it("a rejected sell stops the run: no buys are placed and the failure is explained", async () => {
    fake.placeError = () => new SnapTradeError(400, "/trade/place", "insufficient shares");
    const id = await makeRun([trade("A", "sell", 5, 100), trade("B", "buy", 5, 100)]);
    await exec.startExecution(userId, id);
    await ageOrders(id);
    const v = await exec.advanceRun(userId, id);
    expect(v.status).toBe("failed");
    expect(fake.placed).toHaveLength(0);
    expect(v.orders[0].error).toMatch(/insufficient shares/);
    expect(v.note).toMatch(/no buys were placed/);
  });

  it("one rejected buy among several leaves the run partial, with the good order still tracked", async () => {
    const id = await makeRun([trade("B", "buy", 2, 100), trade("C", "buy", 2, 100)]);
    fake.placeError = (body) => (body.symbol === "C" ? new SnapTradeError(400, "/trade/place", "not tradable") : null);
    await exec.startExecution(userId, id); // no sells -> straight to buys
    expect(fake.placed).toHaveLength(1); // C was refused at submission, B went through
    fill("b-1");
    await ageOrders(id);
    const v = await exec.advanceRun(userId, id);
    expect(v.status).toBe("partial");
    expect(v.orders.map((o) => `${o.symbol}:${o.status}`).sort()).toEqual(["B:EXECUTED", "C:FAILED"]);
    expect(v.orders.find((o) => o.symbol === "C")!.error).toMatch(/not tradable/);
  });

  it("an all-cash account goes straight to buys with the previewed amounts", async () => {
    const id = await makeRun([trade("B", "buy", 4, 100)]);
    await exec.startExecution(userId, id);
    expect(fake.placed).toEqual([expect.objectContaining({ action: "BUY", symbol: "B", units: 4 })]);
    fill("b-1");
    await ageOrders(id);
    expect((await exec.advanceRun(userId, id)).status).toBe("completed");
  });

  it("an expired preview (>5 min) is refused and cancelled, nothing is placed", async () => {
    const id = await makeRun([trade("B", "buy", 1, 100)], { createdMsAgo: 6 * 60 * 1000 });
    await expect(exec.startExecution(userId, id)).rejects.toBeInstanceOf(errors.PreviewExpiredError);
    expect(fake.placed).toHaveLength(0);
    expect(await runStatus(id)).toBe("cancelled");
  });

  it("another user's run is not found (and not executed)", async () => {
    const other = `test-${randomUUID()}`;
    await sql`insert into users (id) values (${other})`;
    try {
      const id = await makeRun([trade("B", "buy", 1, 100)], { user: other });
      await expect(exec.startExecution(userId, id)).rejects.toBeInstanceOf(errors.RunNotFoundError);
      await expect(exec.advanceRun(userId, id)).rejects.toBeInstanceOf(errors.RunNotFoundError);
      expect(fake.placed).toHaveLength(0);
    } finally {
      await sql`delete from users where id = ${other}`;
    }
  });

  const ago = (runId: string, interval: string) => sql`update rebalance_runs set updated_at = now() - ${interval}::interval where id = ${runId}`;

  it("sells waiting on a closed market do NOT end the run: it keeps waiting, and the buys stay queued (the bug)", async () => {
    const id = await makeRun([trade("A", "sell", 5, 100), trade("B", "buy", 5, 100)]);
    await exec.startExecution(userId, id);
    await ago(id, "6 hours"); // the old code gave up after 60 seconds and dropped the buys
    await ageOrders(id);
    const v = await exec.advanceRun(userId, id);
    expect(v.status).toBe("executing_sells");
    expect(v.queued).toEqual([expect.objectContaining({ symbol: "B", side: "buy", units: 5 })]);
    expect(fake.placed.filter((p) => p.action === "BUY")).toHaveLength(0);
  });

  it("the background worker places the buys once the sells fill, with nobody on the page", async () => {
    const id = await makeRun([trade("A", "sell", 5, 100), trade("B", "buy", 5, 100)]);
    await exec.startExecution(userId, id);
    await ago(id, "6 hours");
    await ageOrders(id);
    await runs.advanceRuns([{ id, userId }]); // still closed: nothing happens
    expect(fake.placed).toHaveLength(1);

    fill("b-1"); // the market opens and the sell fills
    fake.account = acct(500, []);
    await ageOrders(id);
    await runs.advanceRuns([{ id, userId }]); // a worker pass: no browser involved
    expect(fake.placed[1]).toMatchObject({ action: "BUY", symbol: "B", units: 5 });
    expect(await runStatus(id)).toBe("executing_buys");

    fill("b-2");
    await ageOrders(id);
    await runs.advanceRuns([{ id, userId }]);
    expect(await runStatus(id)).toBe("completed");
  });

  it("the post-confirm driver places the buys as soon as the sells fill, even if the user leaves", async () => {
    const id = await makeRun([trade("A", "sell", 5, 100), trade("B", "buy", 5, 100)]);
    await exec.startExecution(userId, id);
    fill("b-1");
    fake.account = acct(500, []);
    await ageOrders(id);
    await drive.driveRun(userId, id, 2000, 20); // returns once the run leaves the "executing" states or time is up
    expect(fake.placed.filter((p) => p.action === "BUY")).toHaveLength(1);
  });

  it("several runs and pollers on one account share ONE recentOrders call (protects the rate limit)", async () => {
    const calls = { n: 0 };
    const id1 = await makeRun([trade("B", "buy", 1, 100)]);
    const id2 = await makeRun([trade("C", "buy", 1, 100)]);
    await exec.startExecution(userId, id1);
    fake.placed.length = 0;
    await ageOrders(id1);
    fake.recentOrdersCalls = 0;
    await Promise.all([exec.advanceRun(userId, id1), exec.advanceRun(userId, id1), runs.advanceRuns([{ id: id1, userId }])]);
    calls.n = fake.recentOrdersCalls;
    expect(calls.n).toBe(1);
    void id2;
  });

  it("a second rebalance cannot start while one is running on the same account (nothing is placed twice)", async () => {
    const account = `acc-${randomUUID()}`;
    const first = await makeRun([trade("A", "sell", 5, 100), trade("B", "buy", 5, 100)], { account });
    const second = await makeRun([trade("A", "sell", 5, 100), trade("B", "buy", 5, 100)], { account });
    await exec.startExecution(userId, first);
    const placedBefore = fake.placed.length;

    await expect(exec.startExecution(userId, second)).rejects.toBeInstanceOf(errors.RunInProgressError);
    expect(fake.placed).toHaveLength(placedBefore); // the database refused it before any order was sent
    expect(await runStatus(second)).toBe("previewed");
    expect(await runsRepo.findActiveRun(userId, account)).toBe(first);
  });

  it("a new preview is refused while a rebalance is running on the account", async () => {
    const account = `acc-${randomUUID()}`;
    const first = await makeRun([trade("B", "buy", 1, 100)], { account });
    await exec.startExecution(userId, first);
    await expect(preview.createPreview(userId, account)).rejects.toMatchObject({ name: "RunInProgressError", runId: first });
  });

  it("different accounts can rebalance at the same time, and the slot frees up when the run ends", async () => {
    const a1 = `acc-${randomUUID()}`;
    const r1 = await makeRun([trade("B", "buy", 1, 100)], { account: a1 });
    const r2 = await makeRun([trade("C", "buy", 1, 100)]);
    await exec.startExecution(userId, r1);
    await expect(exec.startExecution(userId, r2)).resolves.toBeUndefined(); // another account: fine

    fill("b-1");
    await ageOrders(r1);
    expect((await exec.advanceRun(userId, r1)).status).toBe("completed");
    expect(await runsRepo.findActiveRun(userId, a1)).toBeNull();
    const again = await makeRun([trade("B", "buy", 1, 100)], { account: a1 });
    await expect(exec.startExecution(userId, again)).resolves.toBeUndefined(); // the account is free again
  });

  it("history lists placed and queued rebalances newest first, with queued buys, and omits unconfirmed previews", async () => {
    const hid = `test-${randomUUID()}`;
    await sql`insert into users (id) values (${hid})`;
    try {
      const mk = async (when: string, status: string) => {
        const plan = { plan: { trades: [trade("A", "sell", 1, 100), trade("B", "buy", 1, 100)] }, impact: {}, symbolIds: {}, execution: { sellsSubmitted: true, buysSubmitted: false, buysSkipped: false, note: null } };
        const [r] = await sql`insert into rebalance_runs (user_id, account_id, status, plan_json, created_at) values (${hid}, ${`acc-${randomUUID()}`}, ${status}::run_status, ${sql.json(plan as never)}, ${when}::timestamptz) returning id`;
        return r.id as string;
      };
      const oldDone = await mk("2026-01-01T10:00:00Z", "completed");
      const running = await mk("2026-01-03T10:00:00Z", "executing_sells");
      await mk("2026-01-04T10:00:00Z", "previewed"); // never confirmed: must not appear
      await mk("2026-01-05T10:00:00Z", "cancelled"); // never placed: must not appear
      await sql`insert into rebalance_orders (run_id, symbol, side, units, est_value, status, brokerage_order_id) values (${running}, 'A', 'sell', 1, 100, 'PENDING', 'x-1')`;

      const rows = await history.listHistory(hid);
      expect(rows.map((r) => r.id)).toEqual([running, oldDone]); // newest first
      expect(rows[0].orders.map((o) => `${o.side} ${o.symbol} ${o.status}`)).toEqual(["sell A PENDING"]);
      expect(rows[0].queued.map((q) => `${q.side} ${q.symbol}`)).toEqual(["buy B"]); // confirmed, not placed yet
    } finally {
      await sql`delete from users where id = ${hid}`;
    }
  });

  it("the target mode survives save and load, defaults to 'direct', and old clients that omit it still work", async () => {
    const account = `acc-${randomUUID()}`;
    expect((await targetsStore.getTargets(userId, account)).settings.targetMode).toBe("direct"); // nothing saved yet

    const body = (extra: object) => targetsStore.targetsBodySchema.parse({ targets: [{ symbol: "AAPL", pct: 20 }, { symbol: "spy", pct: 30 }], driftBandPct: 3, cashBufferPct: 0.5, ...extra });
    await targetsStore.saveTargets(userId, account, body({ targetMode: "exposure" }));
    const saved = await targetsStore.getTargets(userId, account);
    expect(saved.settings.targetMode).toBe("exposure");
    expect(saved.targets).toEqual({ AAPL: 20, SPY: 30 });

    await targetsStore.saveTargets(userId, account, body({})); // an older client that doesn't send the field
    expect((await targetsStore.getTargets(userId, account)).settings.targetMode).toBe("direct");
    expect(() => body({ targetMode: "everything" })).toThrow(); // unknown modes are rejected
  });

  it("exposure mode validates bounds only (the sum is judged once ETF weights are known); direct mode still enforces <= 100", () => {
    const parse = (targetMode: string, a: number, b: number) => targetsStore.targetsBodySchema.parse({ targets: [{ symbol: "AAPL", pct: a }, { symbol: "SPY", pct: b }], driftBandPct: 3, cashBufferPct: 0.5, targetMode });
    expect(targetsStore.bodyProblem(parse("direct", 80, 40))).toMatch(/more than 100%/);
    expect(targetsStore.bodyProblem(parse("exposure", 80, 40))).toBeNull(); // 120 typed can still be valid once ETFs are counted
    expect(targetsStore.bodyProblem(parse("exposure", 120, 10))).toMatch(/between 0% and 100%/);
  });

  it("one run failing never stops the others in a worker pass", async () => {
    const id = await makeRun([trade("B", "buy", 1, 100)]);
    await exec.startExecution(userId, id);
    const advanced = await runs.advanceRuns([{ id: randomUUID(), userId }, { id, userId }]);
    expect(advanced).toBe(1); // the bogus run threw RunNotFound, the real one still advanced
  });

  it("buys that stay open keep the run executing (not 'partly done'); a late fill completes it", async () => {
    const id = await makeRun([trade("B", "buy", 1, 100)]);
    await exec.startExecution(userId, id);
    await ago(id, "5 hours");
    await ageOrders(id);
    let v = await exec.advanceRun(userId, id);
    expect(v.status).toBe("executing_buys");
    fill("b-1");
    await ageOrders(id);
    v = await exec.advanceRun(userId, id);
    expect(v.status).toBe("completed");
  });

  it("the 24h backstop: sells that never fill close the run as partial and skip the buys", async () => {
    const id = await makeRun([trade("A", "sell", 5, 100), trade("B", "buy", 5, 100)]);
    await exec.startExecution(userId, id);
    await ago(id, "25 hours");
    await ageOrders(id);
    const v = await exec.advanceRun(userId, id);
    expect(v.status).toBe("partial");
    expect(v.note).toMatch(/didn't fill within a day/);
    expect(fake.placed.filter((p) => p.action === "BUY")).toHaveLength(0);
  });

  it("when sells fill after a run was closed out, the stale 'haven't filled' note is replaced by what really happened", async () => {
    const id = await makeRun([trade("A", "sell", 5, 100), trade("B", "buy", 5, 100)]);
    await exec.startExecution(userId, id);
    await ago(id, "25 hours");
    await ageOrders(id);
    expect((await exec.advanceRun(userId, id)).note).toMatch(/didn't fill within a day/);
    fill("b-1");
    await ageOrders(id);
    const v = await exec.advanceRun(userId, id);
    expect(v.status).toBe("partial"); // its buys were skipped, so it is never "completed"
    expect(v.note).toMatch(/filled after this run had been closed out/);
    expect(fake.placed.filter((p) => p.action === "BUY")).toHaveLength(0);
  });

  it("the 24h backstop on buys: closes as partial, and a fill after that still flips it to completed", async () => {
    const id = await makeRun([trade("B", "buy", 1, 100)]);
    await exec.startExecution(userId, id);
    await ago(id, "25 hours");
    await ageOrders(id);
    expect((await exec.advanceRun(userId, id)).status).toBe("partial");
    fill("b-1");
    await ageOrders(id);
    expect((await exec.advanceRun(userId, id)).status).toBe("completed");
  });

  it("a submit whose result we never saw is reported as unknown, not resubmitted", async () => {
    const id = await makeRun([trade("B", "buy", 1, 100)]);
    await sql`update rebalance_runs set status = 'executing_buys', plan_json = jsonb_set(plan_json, '{execution,buysSubmitted}', 'true') where id = ${id}`;
    await sql`insert into rebalance_orders (run_id, symbol, side, units, est_value, status, updated_at) values (${id}, 'B', 'buy', 1, 100, 'pending', now() - interval '2 minutes')`;
    const v = await exec.advanceRun(userId, id);
    expect(v.orders[0].status).toBe("FAILED");
    expect(v.orders[0].error).toMatch(/couldn't confirm/);
    expect(fake.placed).toHaveLength(0);
  });
});
