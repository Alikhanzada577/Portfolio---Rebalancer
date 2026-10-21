import {
  boolean,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const users = pgTable("users", {
  id: text("id").primaryKey(), // id_token `sub`
  email: text("email"),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: createdAt(),
});

const userId = () =>
  text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });

export const oauthTokens = pgTable("oauth_tokens", {
  userId: userId().primaryKey(),
  accessTokenEnc: text("access_token_enc").notNull(),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  scope: text("scope").notNull(),
  updatedAt: updatedAt(),
});

export const targets = pgTable(
  "targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    accountId: text("account_id").notNull(),
    symbol: text("symbol").notNull(),
    targetPct: numeric("target_pct", { precision: 7, scale: 4, mode: "number" }).notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [unique().on(t.userId, t.accountId, t.symbol)],
);

export const accountSettings = pgTable(
  "account_settings",
  {
    userId: userId(),
    accountId: text("account_id").notNull(),
    driftBandPct: numeric("drift_band_pct", { precision: 6, scale: 3, mode: "number" }).notNull().default(3),
    cashBufferPct: numeric("cash_buffer_pct", { precision: 6, scale: 3, mode: "number" }).notNull().default(0.5),
    // What a target % means: the share held directly, or (for stocks) the TOTAL share including what the ETFs hold.
    targetMode: text("target_mode", { enum: ["direct", "exposure"] }).notNull().default("direct"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.accountId] })],
);

export const runStatus = pgEnum("run_status", [
  "previewed",
  "executing_sells",
  "executing_buys",
  "completed",
  "partial",
  "failed",
  "cancelled",
]);

export const rebalanceRuns = pgTable(
  "rebalance_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    accountId: text("account_id").notNull(),
    status: runStatus("status").notNull().default("previewed"),
    planJson: jsonb("plan_json").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // At most ONE rebalance in flight per account, enforced by the database itself. A second one would sell and buy
    // on top of the first (orders that are still open aren't in cash or positions yet), and this holds even when
    // two confirmations race.
    uniqueIndex("one_active_run_per_account").on(t.accountId).where(sql`${t.status} in ('executing_sells', 'executing_buys')`),
  ],
);

export const orderSide = pgEnum("order_side", ["buy", "sell"]);

export const rebalanceOrders = pgTable("rebalance_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .notNull()
    .references(() => rebalanceRuns.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  side: orderSide("side").notNull(),
  units: numeric("units", { precision: 20, scale: 8, mode: "number" }).notNull(),
  estValue: numeric("est_value", { precision: 20, scale: 2, mode: "number" }).notNull(),
  brokerageOrderId: text("brokerage_order_id"),
  // Free text: SnapTrade's order status vocabulary is confirmed in Phase 5.
  status: text("status").notNull().default("pending"),
  error: text("error"),
  updatedAt: updatedAt(),
});

// Cache of ETF constituent weights fetched from Alpha Vantage (free tier: 25 requests/day).
export const etfHoldings = pgTable("etf_holdings", {
  symbol: text("symbol").primaryKey(),
  asOf: text("as_of"),
  source: text("source").notNull(),
  constituents: jsonb("constituents").$type<Record<string, number> | null>(),
  // "failed" rows keep any older constituents and are retried sooner.
  status: text("status", { enum: ["ok", "failed"] }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});
