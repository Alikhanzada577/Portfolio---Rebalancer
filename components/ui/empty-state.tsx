import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function EmptyState({ title, children }: { readonly title: string; readonly children?: ReactNode }) {
  return (
    <Card className="px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</div>}
    </Card>
  );
}
