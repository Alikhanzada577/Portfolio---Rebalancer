import { WeightBar } from "@/components/dashboard/weight-bar";
import type { ExposureRow as Row } from "@/lib/engine/exposure";
import { fmtPct } from "@/lib/format";

type Props = { readonly row: Row; /** The largest true % in the list, so bars are comparable. */ readonly maxPct: number };

/** One company: how much of your portfolio it really is, and where it comes from. */
export function ExposureRow({ row, maxPct }: Props) {
  const via = row.viaEtfs.length > 0 ? `via ${row.viaEtfs.join(", ")}` : "";
  const direct = row.directPct > 0 ? `${fmtPct(row.directPct)} held directly` : "";
  return (
    <li className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 sm:grid-cols-[5rem_1fr_5rem]">
      <span className="font-medium">{row.symbol}</span>
      <span className="min-w-0">
        <WeightBar fraction={row.truePct / maxPct} />
        <span className="mt-1 block truncate text-xs text-muted">{[via, direct].filter(Boolean).join(" · ") || "held directly"}</span>
      </span>
      <span className="text-right text-sm tabular-nums">{fmtPct(row.truePct)}</span>
    </li>
  );
}
