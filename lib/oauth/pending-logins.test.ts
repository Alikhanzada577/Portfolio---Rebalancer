import { describe, expect, it } from "vitest";
import { addPending, LOGIN_TTL_MS, MAX_PENDING, takePending, type PendingLogin } from "@/lib/oauth/pending-logins";

const attempt = (state: string, at = 0): PendingLogin => ({ state, nonce: `n-${state}`, codeVerifier: `v-${state}`, at });

describe("pending logins", () => {
  it("a second click does not invalidate the first attempt (the bug this fixes)", () => {
    const afterTwoClicks = addPending(addPending(undefined, attempt("first"), 0), attempt("second"), 1000);
    expect(takePending(afterTwoClicks, "first", 2000).login?.state).toBe("first");
    expect(takePending(afterTwoClicks, "second", 2000).login?.state).toBe("second");
  });

  it("each attempt is single use", () => {
    const list = addPending(undefined, attempt("a"), 0);
    const first = takePending(list, "a", 1);
    expect(first.login?.state).toBe("a");
    expect(takePending(first.rest, "a", 2).login).toBeNull(); // replaying the same callback fails
  });

  it("taking one attempt leaves the others pending", () => {
    const list = addPending(addPending(undefined, attempt("a"), 0), attempt("b"), 0);
    expect(takePending(list, "a", 1).rest.map((l) => l.state)).toEqual(["b"]);
  });

  it("an unknown or missing state matches nothing and consumes nothing", () => {
    const list = addPending(undefined, attempt("a"), 0);
    expect(takePending(list, "forged", 1)).toEqual({ login: null, rest: list });
    expect(takePending(list, null, 1).login).toBeNull();
    expect(takePending(undefined, "a", 1)).toEqual({ login: null, rest: [] });
  });

  it("expired attempts are rejected and pruned", () => {
    const list = addPending(undefined, attempt("old", 0), 0);
    expect(takePending(list, "old", LOGIN_TTL_MS - 1).login?.state).toBe("old");
    expect(takePending(list, "old", LOGIN_TTL_MS).login).toBeNull();
    expect(addPending(list, attempt("new", LOGIN_TTL_MS), LOGIN_TTL_MS).map((l) => l.state)).toEqual(["new"]);
  });

  it("keeps only the newest few so the cookie stays small", () => {
    let list: PendingLogin[] | undefined;
    for (let i = 0; i < MAX_PENDING + 3; i++) list = addPending(list, attempt(`s${i}`, i), i);
    expect(list).toHaveLength(MAX_PENDING);
    expect(list![0].state).toBe("s3"); // oldest were dropped
    expect(list!.at(-1)!.state).toBe(`s${MAX_PENDING + 2}`);
  });
});
