import "server-only";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { env } from "@/lib/env";
import type { PendingLogin } from "@/lib/oauth/pending-logins";

type SessionData = {
  userId?: string;
  /** In-flight OAuth attempts (usually one). Each is removed as soon as its callback consumes it. */
  logins?: PendingLogin[];
};

export async function getSession() {
  // iron-session reads Date.now(); Cache Components requires opting into request time first.
  await connection();
  return getIronSession<SessionData>(await cookies(), {
    password: env.SESSION_PASSWORD,
    cookieName: "rb_session",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // must survive the top-level redirect back from SnapTrade
      path: "/",
    },
  });
}

/** For pages: the signed-in user's id, or redirect to the landing page. */
export async function requireUserId() {
  const { userId } = await getSession();
  if (!userId) redirect("/");
  return userId;
}
