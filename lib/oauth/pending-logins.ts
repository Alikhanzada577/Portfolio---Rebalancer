// Pending OAuth attempts kept in the session cookie. Pure helpers: no I/O, so the rules are unit-tested.
//
// A single slot would let a newer click (second tab, double click, retry after signup/verification) silently
// invalidate the attempt the user is actually finishing. So several attempts are tracked at once, each still
// single-use, tied to its own random `state`, and short-lived.

export type PendingLogin = { state: string; nonce: string; codeVerifier: string; /** epoch ms */ at: number };

export const LOGIN_TTL_MS = 15 * 60 * 1000; // generous: signing up and verifying an email can take a while
export const MAX_PENDING = 5; // bounds cookie size; the oldest attempt is dropped first

const live = (list: PendingLogin[], now: number) => list.filter((l) => now - l.at < LOGIN_TTL_MS);

/** Adds an attempt, dropping expired ones and keeping only the newest MAX_PENDING. */
export function addPending(list: PendingLogin[] | undefined, login: PendingLogin, now = Date.now()): PendingLogin[] {
  return [...live(list ?? [], now), login].slice(-MAX_PENDING);
}

/**
 * Finds the attempt for `state` and removes it (single use). `rest` is every other still-valid attempt,
 * which stays pending so a second tab can still finish.
 */
export function takePending(list: PendingLogin[] | undefined, state: string | null, now = Date.now()): { login: PendingLogin | null; rest: PendingLogin[] } {
  const valid = live(list ?? [], now);
  const login = state ? (valid.find((l) => l.state === state) ?? null) : null;
  return { login, rest: login ? valid.filter((l) => l !== login) : valid };
}
