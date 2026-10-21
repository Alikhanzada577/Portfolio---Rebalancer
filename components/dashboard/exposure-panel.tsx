import { ExposureRow } from "@/components/dashboard/exposure-row";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import type { EtfData, Exposure } from "@/lib/engine/exposure";
import { fmtPct } from "@/lib/format";

type Props = { readonly exposure: Exposure; readonly etfData: Record<string, EtfData | undefined> };

const TOP_N = 8;

/** The companies you really own once ETFs are looked through, biggest first, with which ETFs bring them. */
export function ExposurePanel({ exposure, etfData }: Props) {
  // Only symbols that actually sit inside a held ETF with data are interesting here.
  const looked = Object.entries(etfData).filter(([symbol, data]) => data && exposure.rows.some((r) => r.symbol === symbol));
  const companies = exposure.rows.filter((r) => r.truePct > 0 && r.viaEtfs.length > 0).slice(0, TOP_N);
  const maxPct = Math.max(...companies.map((r) => r.truePct), 0.0001);

  return (
    <Panel title="True exposure" description="The companies you really own, including what's inside your ETFs">
      <div className="space-y-4">
        {companies.length > 0 ? (
          <ul className="space-y-3.5">
            {companies.map((row) => (
              <ExposureRow key={row.symbol} row={row} maxPct={maxPct} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            {looked.length === 0 && exposure.opaque.length === 0
              ? "Hold an ETF like SPY or VOO and the biggest companies inside it will be listed here, together with anything you own directly."
              : "Your ETFs hold no companies we have data for."}
          </p>
        )}

        {exposure.unattributedPct > 0.05 && <p className="text-xs text-muted">{fmtPct(exposure.unattributedPct)} of your portfolio is in ETF holdings beyond the top companies we have weights for.</p>}

        {exposure.opaque.map((symbol) => (
          <Notice key={symbol}>Look-through data not available for {symbol}. It is counted as itself.</Notice>
        ))}

        {looked.length > 0 && <p className="text-xs text-muted">Weights are approximate: {looked.map(([symbol, data]) => `${symbol} (${data!.source}, as of ${data!.asOf})`).join("; ")}.</p>}
      </div>
    </Panel>
  );
}
