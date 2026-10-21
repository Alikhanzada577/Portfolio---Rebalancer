import { NavLink } from "@/components/layout/nav-link";
import { getSession } from "@/lib/session";

type Props = { readonly href: string; readonly label: string; readonly matches: string[] };

/** A nav link that only exists for signed-in users (reads the session at request time, so render it inside <Suspense>). */
export async function SessionLink(props: Props) {
  const { userId } = await getSession();
  return userId ? <NavLink {...props} /> : null;
}
