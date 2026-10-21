import { z } from "zod";

// Shapes verified against real responses (Binance SPOT, Alpaca Paper) and the OpenAPI spec.
// Loose objects: SnapTrade may add fields, we only depend on the ones listed.

const numeric = z.union([z.string(), z.number()]).nullable().optional();

export const accountsSchema = z.array(
  z.looseObject({
    id: z.string(),
    brokerage_authorization: z.string(),
    name: z.string().nullable(),
    institution_name: z.string(),
    is_paper: z.boolean().optional(),
    balance: z.looseObject({ total: z.looseObject({ amount: z.number().nullable(), currency: z.string() }).nullable() }).optional(),
  }),
);

export const connectionsSchema = z.array(
  z.looseObject({
    id: z.string(),
    type: z.string().nullable(), // "read" | "trade": what THIS connection was granted
    disabled: z.boolean(),
    brokerage: z.looseObject({
      allows_trading: z.boolean().optional(),
      allows_fractional_units: z.boolean().optional(),
      maintenance_mode: z.boolean().optional(),
    }),
  }),
);

export const balancesSchema = z.array(
  z.looseObject({
    currency: z.looseObject({ code: z.string() }),
    cash: z.number().nullable(),
  }),
);

export const positionsSchema = z.looseObject({
  results: z.array(
    z.looseObject({
      // Derivatives (options, futures) have a different instrument shape without `symbol`.
      instrument: z.looseObject({ kind: z.string(), symbol: z.string().optional() }),
      units: numeric,
      price: numeric,
      currency: z.string().nullable().optional(),
    }),
  ),
  data_freshness: z.looseObject({ as_of: z.string() }),
});

export type SnapAccount = z.infer<typeof accountsSchema>[number];
export type SnapConnection = z.infer<typeof connectionsSchema>[number];
export type SnapBalance = z.infer<typeof balancesSchema>[number];
export type SnapPosition = z.infer<typeof positionsSchema>["results"][number];

// --- Trading (verified against live responses; the impact reply says `estimated_commissions`, the spec says singular) ---

const maybeNumber = z.number().nullable().optional();

export const quotesSchema = z.array(
  z.looseObject({
    symbol: z.looseObject({
      id: z.string(), // universal_symbol_id, needed by the impact check
      symbol: z.string(),
      type: z.looseObject({ code: z.string() }).nullable().optional(),
    }),
    last_trade_price: maybeNumber,
    ask_price: maybeNumber,
    bid_price: maybeNumber,
  }),
);

export const impactSchema = z.looseObject({
  trade_impacts: z
    .array(
      z.looseObject({
        remaining_cash: maybeNumber,
        estimated_commission: maybeNumber,
        estimated_commissions: maybeNumber,
        forex_fees: maybeNumber,
      }),
    )
    .optional(),
});

export const orderRecordSchema = z.looseObject({
  brokerage_order_id: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  filled_quantity: z.union([z.string(), z.number()]).nullable().optional(),
  execution_price: z.union([z.string(), z.number()]).nullable().optional(),
});

export const recentOrdersSchema = z.looseObject({ orders: z.array(orderRecordSchema) });
export const orderListSchema = z.array(orderRecordSchema);


export const symbolSearchSchema = z.array(
  z.looseObject({
    symbol: z.string(),
    description: z.string().nullable().optional(),
    currency: z.looseObject({ code: z.string() }).nullable().optional(),
    exchange: z.looseObject({ code: z.string() }).nullable().optional(),
    type: z.looseObject({ code: z.string(), description: z.string().nullable().optional(), is_supported: z.boolean().optional() }).nullable().optional(),
  }),
);
