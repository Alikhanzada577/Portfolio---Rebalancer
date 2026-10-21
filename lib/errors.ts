import "server-only";
import { SnapTradeError } from "@/lib/snaptrade/client";

/** Message for a failed page load. A 429 is common and fixable by waiting, so it gets its own wording. */
export function loadErrorMessage(err: unknown, what: string) {
  if (err instanceof SnapTradeError && err.status === 429) {
    return `SnapTrade is limiting how often ${what} can be read (about 10 requests a minute per account). Wait a minute, then refresh.`;
  }
  return `We couldn't load ${what} from SnapTrade. Please refresh to try again.`;
}
