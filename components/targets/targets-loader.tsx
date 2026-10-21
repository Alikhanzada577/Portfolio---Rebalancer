import { notFound } from "next/navigation";
import { ReauthScreen } from "@/components/auth/reauth-screen";
import { TargetsEditor } from "@/components/targets/targets-editor";
import { Notice } from "@/components/ui/notice";
import { uuidParam } from "@/lib/api";
import { CASH } from "@/lib/engine/drift";
import { ETF_HOLDINGS } from "@/data/etf-holdings";
import { computeExposure } from "@/lib/engine/exposure";
import { exposureWeights } from "@/lib/engine/exposure-targets";
import { accountValue } from "@/lib/engine/portfolio";
import { getEtfData } from "@/lib/etf/holdings";
import { loadErrorMessage } from "@/lib/errors";
import { ReauthRequired } from "@/lib/oauth/tokens";
import { AccountNotFoundError, loadAccount } from "@/lib/portfolio";
import { requireUserId } from "@/lib/session";
import { getTargets } from "@/lib/targets";

/** Fetches the account and its saved targets, then renders the editor. Render inside <Suspense>. */
export async function TargetsLoader({ params }: { readonly params: PageProps<"/accounts/[id]/targets">["params"] }) {
  const userId = await requireUserId();
  const parsed = uuidParam.safeParse((await params).id);
  if (!parsed.success) notFound();
  const accountId = parsed.data;

  let account, saved;
  try {
    [account, saved] = await Promise.all([loadAccount(userId, accountId), getTargets(userId, accountId)]);
  } catch (err) {
    if (err instanceof ReauthRequired) return <ReauthScreen />;
    if (err instanceof AccountNotFoundError) notFound();
    console.error("targets page: load failed", err instanceof Error ? err.name : "unknown");
    return <Notice tone="error">{loadErrorMessage(err, "this account")}</Notice>;
  }

  if (!account.currencyOk) return <Notice>This account isn&apos;t in a single USD currency, so it can&apos;t be rebalanced in this version.</Notice>;

  const total = accountValue(account);
  const currentWeights: Record<string, number> = {};
  for (const h of account.holdings) currentWeights[h.symbol] = total > 0 ? (h.value / total) * 100 : 0;
  if (account.cash > 0 && total > 0) currentWeights[CASH] = (account.cash / total) * 100;

  // Cash is the remainder, not something typed. A legacy saved CASH row is ignored here (its value is implied)
  // and dropped the next time the targets are saved.
  const savedRows = Object.entries(saved.targets)
    .filter(([symbol]) => symbol !== CASH)
    .map(([symbol, pct]) => ({ symbol, pct: String(pct), held: account.holdings.some((h) => h.symbol === symbol) }));
  const unsetHoldings = account.holdings.filter((h) => !(h.symbol in saved.targets)).map((h) => ({ symbol: h.symbol, pct: "", held: true }));

  // ETF weights for the ETFs held or already targeted (cached 24h), so the editor can show total exposure and explain
  // how "total exposure" targets turn into direct ones. Tiny weights are dropped to keep what is sent to the browser small.
  const heldEtfs = account.holdings.filter((h) => h.assetType === "etf").map((h) => h.symbol);
  const targetedKnownEtfs = Object.keys(saved.targets).filter((s) => s in ETF_HOLDINGS);
  const etfSymbols = [...new Set([...heldEtfs, ...targetedKnownEtfs])];
  const etfData = await getEtfData(etfSymbols);
  const etfWeights = Object.fromEntries(
    Object.entries(etfData).flatMap(([etf, data]) => (data ? [[etf, Object.fromEntries(Object.entries(data.constituents).filter(([, w]) => w >= 0.0005))] as const] : [])),
  );
  const exposure = exposureWeights(computeExposure(account.holdings, account.cash, etfData));

  return (
    <TargetsEditor
      accountId={accountId}
      initialRows={[...savedRows, ...unsetHoldings]}
      currentWeights={currentWeights}
      exposureWeights={exposure}
      etfWeights={etfWeights}
      etfSymbols={[...new Set([...etfSymbols, ...Object.keys(ETF_HOLDINGS)])]}
      settings={saved.settings}
    />
  );
}
