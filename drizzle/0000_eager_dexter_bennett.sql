CREATE TYPE "public"."order_side" AS ENUM('buy', 'sell');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('previewed', 'executing_sells', 'executing_buys', 'completed', 'partial', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "account_settings" (
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"drift_band_pct" numeric(6, 3) DEFAULT 3 NOT NULL,
	"cash_buffer_pct" numeric(6, 3) DEFAULT 0.5 NOT NULL,
	CONSTRAINT "account_settings_user_id_account_id_pk" PRIMARY KEY("user_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"user_id" text PRIMARY KEY NOT NULL,
	"access_token_enc" text NOT NULL,
	"refresh_token_enc" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"scope" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rebalance_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"side" "order_side" NOT NULL,
	"units" numeric(20, 8) NOT NULL,
	"est_value" numeric(20, 2) NOT NULL,
	"brokerage_order_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rebalance_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"status" "run_status" DEFAULT 'previewed' NOT NULL,
	"plan_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"symbol" text NOT NULL,
	"target_pct" numeric(7, 4) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "targets_user_id_account_id_symbol_unique" UNIQUE("user_id","account_id","symbol")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_settings" ADD CONSTRAINT "account_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rebalance_orders" ADD CONSTRAINT "rebalance_orders_run_id_rebalance_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."rebalance_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rebalance_runs" ADD CONSTRAINT "rebalance_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;