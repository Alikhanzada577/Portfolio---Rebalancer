import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";

/** Plain link: the login route redirects off-site, so client-side navigation doesn't apply. */
export function SignInButton({ children = "Sign in with SnapTrade" }: { readonly children?: ReactNode }) {
  return (
    <ButtonLink href="/api/auth/login" external>
      {children}
    </ButtonLink>
  );
}
