import "server-only";
import { z } from "zod";
import { ETF_HOLDINGS } from "@/data/etf-holdings";
import { resolveTargets, targetedEtfs } from "@/lib/engine/exposure-targets";
import { getEtfData } from "@/lib/etf/holdings";
import { combinedExposure, type EtfData } from "@/lib/engine/exposure";
import { accountStatus, type AccountStatus } from "@/lib/engine/account-status";
import type { AccountSnapshot } from "@/lib/engine/portfolio";
import { ReauthRequired } from "@/lib/oauth/tokens";
import { snaptradeFetch, SnapTradeError } from "@/lib/snaptrade/client";
import { normalizeAccount } from "@/lib/snaptrade/normalize";
import { accountsSchema, balancesSchema, connectionsSchema, positionsSchema } from "@/lib/snaptrade/schemas";
import { findActiveRun } from "@/lib/rebalance/runs";
import { getTargets } from "@/lib/targets";

export type PortfolioData = {
  accounts: AccountSnapshot[];
  /** Accounts we couldn't read this time. One failing brokerage shouldn't blank the dashboard. */
  failed: { accountId: string; name: string }[];
  /** Per account: has targets? drifted? Drives the "what to do next" guidance. */
  statuses: Record<string, AccountStatus>;
  /** accountId -> id of the rebalance currently running on it. */
  activeRuns: Record<string, string>;
  etfData: Record<string, EtfData | undefined>;
  exposure: ReturnType<typeof combinedExposure>;
};

type Account = z.infer<typeof accountsSchema>[number];
type Connection = z.infer<typeof connectionsSchema>[number];

/** Balances + positions for one account, normalized. Throws SnapTradeError / ReauthRequired. */
async function snapshotAccount(userId: string, account: Account, connections: Connection[]) {
  const [balances, positions] = await Promise.all([
    snaptradeFetch(userId, `/accounts/${account.id}/balances`, balancesSchema),
    snaptradeFetch(userId, `/accounts/${account.id}/positions/all`, positionsSchema),
  ]);
  return normalizeAccount({
    account,
    connection: connections.find((c) => c.id === account.brokerage_authorization),
    balances,
    positions: positions.results,
    asOf: positions.data_freshness.as_of,
  });
}

export class AccountNotFoundError extends Error {
  constructor() {
    super("Account not found for this user");
    this.name = "AccountNotFoundError";
  }
}

/** Fresh snapshot of ONE account. The accounts list is the ownership check: ids outside it are rejected. */
export async function loadAccount(userId: string, accountId: string): Promise<AccountSnapshot> {
  const [accounts, connections] = await Promise.all([
    snaptradeFetch(userId, "/accounts", accountsSchema),
    snaptradeFetch(userId, "/authorizations", connectionsSchema),
  ]);
  const account = accounts.find((a) => a.id === accountId);
  if (!account) throw new AccountNotFoundError();
  return snapshotAccount(userId, account, connections);
}

/** Fresh snapshot of every account the user shared. Throws ReauthRequired if access is gone. */
export async function loadPortfolio(userId: string): Promise<PortfolioData> {
  const [accounts, connections] = await Promise.all([
    snaptradeFetch(userId, "/accounts", accountsSchema),
    snaptradeFetch(userId, "/authorizations", connectionsSchema),
  ]);

  const results = await Promise.all(
    accounts.map(async (account) => {
      try {
        return await snapshotAccount(userId, account, connections);
      } catch (err) {
        if (err instanceof ReauthRequired) throw err;
        if (!(err instanceof SnapTradeError)) throw err;
        return { accountId: account.id, name: account.name ?? account.institution_name };
      }
    }),
  );
  const snapshots = results.filter((r): r is AccountSnapshot => "holdings" in r);
  const failed = results.filter((r): r is { accountId: string; name: string } => !("holdings" in r));

  // ETF weights first: "total exposure" accounts need them to turn targets into direct targets before judging drift.
  const etfSymbols = snapshots.flatMap((a) => a.holdings.filter((h) => h.assetType === "etf").map((h) => h.symbol));
  const etfData = await getEtfData(etfSymbols);

  const perAccount = await Promise.all(
    snapshots.map(async (a) => {
      const [{ targets, settings }, activeRunId] = await Promise.all([getTargets(userId, a.accountId), findActiveRun(userId, a.accountId)]);
      // Same resolution the Rebalance page uses (shared pure function), so "Drifted" here always matches the preview.
      const heldEtfs = a.holdings.filter((h) => h.assetType === "etf").map((h) => h.symbol);
      const effective = resolveTargets(targets, settings.targetMode, targetedEtfs(targets, heldEtfs, Object.keys(ETF_HOLDINGS)), etfData).targets;
      const status: AccountStatus = activeRunId ? "rebalancing" : accountStatus(a, effective, settings.driftBandPct);
      return { accountId: a.accountId, status, activeRunId };
    }),
  );
  const statusEntries = perAccount.map((p) => [p.accountId, p.status] as const);
  const activeRuns = Object.fromEntries(perAccount.flatMap((p) => (p.activeRunId ? [[p.accountId, p.activeRunId] as const] : [])));

  return { accounts: snapshots, failed, statuses: Object.fromEntries(statusEntries), activeRuns, etfData, exposure: combinedExposure(snapshots, etfData) };
}
