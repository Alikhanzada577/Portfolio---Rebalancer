import { Card } from "@/components/ui/card";

type Props = { readonly step: string; readonly title: string; readonly children: string };

export function FeatureCard({ step, title, children }: Props) {
  return (
    <Card className="p-6">
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">{step}</span>
      <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm text-muted">{children}</p>
    </Card>
  );
}
