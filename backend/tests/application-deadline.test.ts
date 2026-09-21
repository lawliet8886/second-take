import { afterEach, describe, expect, it, vi } from "vitest";
import { TurnOrchestrator } from "../src/orchestration/turn-orchestrator.js";
import { InMemorySessionStore } from "../src/sessions/store.js";
import { SelectorCircuitBreaker } from "../src/resilience/circuit-breaker.js";
import { InMemoryTelemetry } from "../src/telemetry/telemetry.js";
import { FakeRouter, FakeSelector } from "./helpers.js";
import type { RouterResult, SelectorResult } from "../src/domain/contracts.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function setup(router = new FakeRouter(), selector = new FakeSelector()) {
  const sessions = new InMemorySessionStore();
  const engine = new TurnOrchestrator(sessions, router, selector, new SelectorCircuitBreaker(), new InMemoryTelemetry());
  const session = engine.createSession("en-US");
  return { engine, sessions, session, router, selector };
}
afterEach(() => vi.useRealTimers());
describe("application deadline", () => {
  it("returns router recovery before the Android deadline and ignores a late route", async () => {
    vi.useFakeTimers();
    const pending = deferred<RouterResult>(), x = setup();
    const lateResult = await x.router.route();
    vi.spyOn(x.router, "route").mockReturnValue(pending.promise);
    const request = { text: "What is left?", clientTurnId: "slow-router" };
    const result = x.engine.submitTurn(x.session.sessionId, request);
    await vi.advanceTimersByTimeAsync(10_000);
    expect((await result).type).toBe("TRANSPORT_FAILURE");
    const beforeLate = structuredClone(x.engine.getSession(x.session.sessionId));
    pending.resolve(lateResult);
    await vi.advanceTimersByTimeAsync(1);
    expect(x.engine.getSession(x.session.sessionId)).toEqual(beforeLate);
    expect(x.selector.calls).toBe(0);
    expect(x.sessions.require(x.session.sessionId).turns).toHaveLength(0);
    expect(await x.engine.submitTurn(x.session.sessionId, request)).toEqual(await result);
  });
  it("uses one safe fallback when the selector stalls, without a late second transition", async () => {
    vi.useFakeTimers();
    const pending = deferred<SelectorResult>(), x = setup();
    vi.spyOn(x.selector, "select").mockReturnValue(pending.promise);
    const result = x.engine.submitTurn(x.session.sessionId, { text: "What is left?", clientTurnId: "slow-selector" });
    await vi.advanceTimersByTimeAsync(10_000);
    expect((await result).type).toBe("RECOVERY_FALLBACK");
    const internal = x.sessions.require(x.session.sessionId);
    expect(internal.turns).toHaveLength(1);
    expect(internal.turns[0]!.candidatePlanIds).toContain(internal.turns[0]!.selectedPlanId);
    const beforeLate = structuredClone(x.engine.getSession(x.session.sessionId));
    pending.resolve({ planId: "NOT_A_CANDIDATE", confidence: "HIGH", latencyMs: 20_000, transportRetries: 0, structuralRetries: 0, attempts: [], usage: { inputTokens: 0, outputTokens: 0, thinkingTokens: 0, totalTokens: 0 } });
    await vi.advanceTimersByTimeAsync(1);
    expect(x.engine.getSession(x.session.sessionId)).toEqual(beforeLate);
    expect(x.engine.rewind(x.session.sessionId, (await result).turnId).messages).toEqual([]);
  });
});
