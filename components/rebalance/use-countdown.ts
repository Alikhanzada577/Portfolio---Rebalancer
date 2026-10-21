"use client";

import { useEffect, useState } from "react";

/** Milliseconds left until `deadline` (epoch ms), ticking once a second. Pass null to stop. */
export function useCountdown(deadline: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (deadline === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  return deadline === null ? 0 : Math.max(0, deadline - now);
}
