import { NextResponse } from "next/server";
import { route, uuidParam } from "@/lib/api";
import { InvalidTargetsError } from "@/lib/engine/drift";
import { loadAccount } from "@/lib/portfolio";
import { bodyProblem, getTargets, saveTargets, targetsBodySchema } from "@/lib/targets";

type Ctx = RouteContext<"/api/accounts/[id]/targets">;

export const GET = route<Ctx>(async (_req, userId, ctx) => {
  const accountId = uuidParam.parse((await ctx.params).id);
  await loadAccount(userId, accountId); // 404 unless this account belongs to the user
  return NextResponse.json(await getTargets(userId, accountId));
});

export const PUT = route<Ctx>(async (req, userId, ctx) => {
  const accountId = uuidParam.parse((await ctx.params).id);
  const body = targetsBodySchema.parse(await req.json());
  const problem = bodyProblem(body);
  if (problem) throw new InvalidTargetsError(problem);
  await loadAccount(userId, accountId);
  await saveTargets(userId, accountId, body);
  return NextResponse.json({ ok: true });
});
