CREATE TABLE "etf_holdings" (
	"symbol" text PRIMARY KEY NOT NULL,
	"as_of" text,
	"source" text NOT NULL,
	"constituents" jsonb,
	"status" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
