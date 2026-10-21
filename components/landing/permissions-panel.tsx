import { Panel } from "@/components/ui/panel";

const PERMISSIONS = [
  { name: "Sign in and email", why: "to identify you. We don't have our own passwords." },
  { name: "Read", why: "accounts, holdings and cash, to show your allocation and drift." },
  { name: "Trade", why: "to place rebalancing orders, only after you review and confirm each one." },
];

export function PermissionsPanel() {
  return (
    <Panel title="What we ask SnapTrade for" description="You can disconnect at any time from Settings.">
      <ul className="space-y-3 text-sm">
        {PERMISSIONS.map(({ name, why }) => (
          <li key={name} className="flex gap-3">
            <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
            <span>
              <strong className="font-medium">{name}</strong> <span className="text-muted">{why}</span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
