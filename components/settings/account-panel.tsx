import { eq } from "drizzle-orm";
import { DisconnectCard } from "@/components/settings/disconnect-card";
import { Panel } from "@/components/ui/panel";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireUserId } from "@/lib/session";

/** The signed-in identity and the disconnect action. Render inside <Suspense>. */
export async function AccountPanel() {
  const userId = await requireUserId();
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return (
    <div className="space-y-6">
      <Panel title="Signed in with SnapTrade">
        <p className="text-sm text-muted">Email</p>
        <p className="font-medium">{user?.email ?? "Unknown email"}</p>
      </Panel>
      <DisconnectCard />
    </div>
  );
}
