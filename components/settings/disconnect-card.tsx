import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

/** Posting to the logout route revokes the SnapTrade refresh token, deletes stored tokens and ends the session. */
export function DisconnectCard() {
  return (
    <Panel title="Disconnect" description="Revoke this app's access at SnapTrade.">
      <form action="/api/auth/logout" method="post" className="space-y-4">
        <p className="text-sm text-muted">Disconnecting revokes this app&apos;s access at SnapTrade and deletes the stored tokens. Your brokerage connections in SnapTrade are not affected.</p>
        <Button type="submit" variant="danger">
          Disconnect and sign out
        </Button>
      </form>
    </Panel>
  );
}
