import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** Horizontally scrollable on small screens, so a wide table never stretches the page. */
export function Table({ children, minWidth = "34rem" }: { readonly children: ReactNode; readonly minWidth?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

type CellProps = { readonly children?: ReactNode; readonly align?: "left" | "right"; readonly className?: string; readonly colSpan?: number };

export function Th({ children, align = "left", className }: CellProps) {
  return <th className={cx("whitespace-nowrap px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-muted", align === "right" ? "text-right" : "text-left", className)}>{children}</th>;
}

export function Td({ children, align = "left", className, colSpan }: CellProps) {
  return (
    <td colSpan={colSpan} className={cx("px-5 py-3", align === "right" && "text-right tabular-nums", className)}>
      {children}
    </td>
  );
}

export const Tr = ({ children, className }: { readonly children: ReactNode; readonly className?: string }) => (
  <tr className={cx("border-t border-line", className)}>{children}</tr>
);
