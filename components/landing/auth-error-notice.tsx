import { Notice } from "@/components/ui/notice";

const MESSAGES: Record<string, string> = {
  denied: "You declined access on SnapTrade, so nothing was shared. Sign in again whenever you're ready.",
  session_lost:
    "We couldn't find your sign-in attempt, so we stopped for safety. This usually means the app was opened at a different address than the one registered with SnapTrade, or cookies are blocked. Open the app at the address in the setup instructions, then sign in once.",
  state_mismatch: "That sign-in was replaced by a newer one (a second click or another tab). Please sign in again and finish it in a single tab.",
  code_expired: "Sign-in took too long and the authorization code expired. Please try again.",
};
const GENERIC = "We couldn't complete sign-in with SnapTrade. Please try again.";

/** Explains why a sign-in attempt failed (the callback redirects here with ?auth_error=<reason>). */
export async function AuthErrorNotice({ searchParams }: { readonly searchParams: PageProps<"/">["searchParams"] }) {
  const { auth_error } = await searchParams;
  if (typeof auth_error !== "string") return null;
  return <Notice tone="error">{MESSAGES[auth_error] ?? GENERIC}</Notice>;
}
