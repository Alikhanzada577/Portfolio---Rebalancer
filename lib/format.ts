const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const units = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });

export const fmtUsd = (n: number) => usd.format(n);
/** Price with enough precision for sub-cent crypto (0.0625 not $0.06). */
export const fmtPrice = (n: number) => (n >= 1 ? usd.format(n) : `$${n.toPrecision(3)}`);
export const fmtUnits = (n: number) => units.format(n);
/** Takes a fraction (0.25 -> "25.0%"). */
export const fmtWeight = (f: number) => (f > 0 && f < 0.0005 ? "<0.1%" : `${(f * 100).toFixed(1)}%`);
/** Takes percentage points (2.3 -> "2.3%"). */
export const fmtPct = (p: number) => `${p.toFixed(1)}%`;

const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
/** "2:24 PM" from an ISO timestamp. */
export const fmtTime = (iso: string) => time.format(new Date(iso));

const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
/** "Oct 21, 1:55 AM" from an ISO timestamp. */
export const fmtDateTime = (iso: string) => dateTime.format(new Date(iso));
