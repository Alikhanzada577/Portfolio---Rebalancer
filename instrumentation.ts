export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Fail fast: validate env once when the server boots, not on the first request.
  await import("@/lib/env");
  // Long-lived servers also advance waiting rebalance runs in the background (no-op on Vercel).
  (await import("@/lib/rebalance/worker")).startRunWorker();
}
