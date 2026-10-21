import { SignInButton } from "@/components/auth/sign-in-button";

export function Hero() {
  return (
    <div className="space-y-6 text-center">
      <h1 className="mx-auto max-w-3xl text-balance text-4xl font-thin tracking-tight sm:text-5xl">Keep your portfolio on target across your brokerages in one click.</h1>
      <p className="mx-auto max-w-2xl text-lg text-muted">See your real allocation, including what your ETFs hold, set targets per account, and place the trades to get back on target after you review them.</p>
      <div className="flex flex-col items-center gap-3">
        <SignInButton />
        <span className="text-sm text-muted">Uses SnapTrade OAuth. We never see your brokerage password.</span>
      </div>
    </div>
  );
}
