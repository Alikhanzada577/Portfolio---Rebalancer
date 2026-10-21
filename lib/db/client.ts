import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

// prepare: false so it works behind Neon's pooled (PgBouncer transaction-mode) endpoint.
export const db = drizzle(postgres(env.DATABASE_URL, { prepare: false }), { schema });
