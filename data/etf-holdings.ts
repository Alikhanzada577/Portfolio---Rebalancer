// data/etf-holdings.ts
// APPROXIMATE weights for demo purposes only. Verify against issuer
// websites and update asOf before relying on these numbers.

type EtfHoldings = {
  asOf: string;
  source: string;
  constituents: Record<string, number>; // fraction of the ETF, 0.07 = 7%
};

// S&P 500 trackers: SPY, VOO and IVV hold (almost) identical weights.
const SP500: Record<string, number> = {
  NVDA: 0.075,
  MSFT: 0.065,
  AAPL: 0.065,
  AMZN: 0.040,
  META: 0.030,
  AVGO: 0.025,
  GOOGL: 0.020,
  GOOG: 0.017,
  TSLA: 0.020,
  "BRK.B": 0.016,
};

export const ETF_HOLDINGS: Record<string, EtfHoldings> = {
  SPY: { asOf: "TODO(verify)", source: "ssga.com (approx.)", constituents: SP500 },
  VOO: { asOf: "TODO(verify)", source: "vanguard.com (approx.)", constituents: SP500 },
  IVV: { asOf: "TODO(verify)", source: "ishares.com (approx.)", constituents: SP500 },

  // Nasdaq-100: more concentrated in big tech than the S&P 500.
  QQQ: {
    asOf: "TODO(verify)",
    source: "invesco.com (approx.)",
    constituents: {
      NVDA: 0.090,
      MSFT: 0.085,
      AAPL: 0.075,
      AMZN: 0.055,
      AVGO: 0.050,
      META: 0.035,
      GOOGL: 0.027,
      GOOG: 0.025,
      TSLA: 0.030,
      NFLX: 0.025,
      COST: 0.025,
    },
  },

  // Total US market: same companies as the S&P 500 plus small/mid caps,
  // so each big name weighs roughly 85-90% of its S&P 500 weight.
  VTI: {
    asOf: "TODO(verify)",
    source: "vanguard.com (approx.)",
    constituents: {
      NVDA: 0.065,
      MSFT: 0.057,
      AAPL: 0.057,
      AMZN: 0.035,
      META: 0.026,
      AVGO: 0.022,
      GOOGL: 0.017,
      GOOG: 0.015,
      TSLA: 0.017,
      "BRK.B": 0.014,
    },
  },
};
