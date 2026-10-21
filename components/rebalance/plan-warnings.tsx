import { Notice } from "@/components/ui/notice";

export function PlanWarnings({ warnings }: { readonly warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <Notice tone="warning">
      <ul className="space-y-1">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </Notice>
  );
}
