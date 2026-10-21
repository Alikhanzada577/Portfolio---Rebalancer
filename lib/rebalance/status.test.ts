import { describe, expect, it } from "vitest";
import { finalResult, isFailure, isTerminal } from "@/lib/rebalance/status";

const o = (...s: string[]) => s.map((status) => ({ status }));

describe("order status", () => {
  it("a submitted order is not done until it reaches a terminal status", () => {
    for (const s of ["PENDING", "ACCEPTED", "QUEUED", "PARTIAL", "NONE"]) expect(isTerminal(s)).toBe(false);
    for (const s of ["EXECUTED", "FAILED", "REJECTED", "CANCELED", "EXPIRED", "PARTIAL_CANCELED"]) expect(isTerminal(s)).toBe(true);
  });
  it("only FAILED and REJECTED are failures", () => {
    expect(isFailure("REJECTED")).toBe(true);
    expect(isFailure("CANCELED")).toBe(false);
  });
});

describe("finalResult", () => {
  it("completed: everything filled", () => expect(finalResult(o("EXECUTED", "EXECUTED"), false)).toBe("completed"));
  it("failed: nothing filled", () => expect(finalResult(o("REJECTED", "FAILED"), false)).toBe("failed"));
  it("partial: some filled, some not", () => {
    expect(finalResult(o("EXECUTED", "REJECTED"), false)).toBe("partial");
    expect(finalResult(o("EXECUTED", "PENDING"), false)).toBe("partial");
  });
  it("partial: a partly filled order is not a failure", () => {
    expect(finalResult(o("PARTIAL_CANCELED"), false)).toBe("partial");
    expect(finalResult(o("PARTIAL"), false)).toBe("partial");
  });
  it("partial: skipped buys stop it being completed even if every placed order filled", () => {
    expect(finalResult(o("EXECUTED"), true)).toBe("partial");
  });
  it("no orders: completed, unless buys were skipped with nothing filled", () => {
    expect(finalResult([], false)).toBe("completed");
    expect(finalResult([], true)).toBe("failed");
  });
});
