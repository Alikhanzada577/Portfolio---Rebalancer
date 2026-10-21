import { SignInButton } from "@/components/auth/sign-in-button";
import { EmptyState } from "@/components/ui/empty-state";

/** Shown whenever SnapTrade access is gone (ReauthRequired). */
export function ReauthScreen() {
  return (
    <EmptyState title="Please sign in again">
      <p className="mb-4">Your SnapTrade access expired or was revoked. Sign in to reconnect. Your targets and settings are kept.</p>
      <SignInButton />
    </EmptyState>
  );
}
