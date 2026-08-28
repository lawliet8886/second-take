import { execFileSync } from "node:child_process";
import type { ModelProfile } from "../contracts/results.js";
import { RESPONSE_PLANS } from "../v05/catalog.js";
import { planById } from "../v05/policy.js";
import { V0531TransportFailure, V0531VertexClient } from "../v0531/vertex.js";
import { selectorDecisionSchema, type SelectorCase, type SelectorDecision, type SelectorRouteRecord } from "./contracts.js";
import { SELECTOR_CONFIG_V056, SELECTOR_MODEL_V056, SELECTOR_SYSTEM_PROMPT_V056, frozenCandidateDescriptions, selectorSchema } from "./config.js";

const descriptions = frozenCandidateDescriptions(RESPONSE_PLANS);
function projectId() { return process.env.GOOGLE_CLOUD_PROJECT?.trim() || execFileSync("cmd.exe", ["/d", "/s", "/c", "gcloud config get-value project"], { encoding: "utf8" }).trim(); }

export function buildSelectorInput(cases: SelectorCase[]) {
  return JSON.stringify({
    instruction: "Return exactly one decision for each item, preserving its id.",
    items: cases.map((item) => ({
      id: item.id, locale: item.locale, userTurn: item.userTurn, resolvedPrimaryIntent: item.intentLock?.confirmedIntent ?? item.userIntent,
      intentLock: item.intentLock, state: { tension: item.state.tension, openness: item.state.openness, resolutionStage: item.state.resolutionStage },
      recentContext: item.recentContext,
      candidates: item.candidatePlanIds.map((id) => ({ id, description: descriptions[id] })),
    })),
  });
}

export class GeminiPlanSelectorV056 {
  readonly client: V0531VertexClient;
  constructor(concurrency = 3) { const project = projectId(); if (!project) throw new Error("VERTEX_PROJECT_REQUIRED"); this.client = new V0531VertexClient(project, concurrency); }

  async selectBatch(batchId: string, cases: SelectorCase[], runtime = false): Promise<SelectorRouteRecord[]> {
    if (!cases.length) return [];
    const signature = cases[0]!.candidatePlanIds.join("|");
    if (cases.some((item) => item.candidatePlanIds.join("|") !== signature)) throw new Error("BATCH_CANDIDATE_SIGNATURE_MISMATCH");
    const profile: ModelProfile = { id: "v056-selector-low", role: "simulator", thinkingLevel: "low", maxOutputTokens: cases.length === 1 ? SELECTOR_CONFIG_V056.maxOutputTokensSingle : SELECTOR_CONFIG_V056.maxOutputTokensBatch, samplingNote: "Frozen finite plan selection." };
    let structuralAttempt = 0; let lastCall: Awaited<ReturnType<V0531VertexClient["call"]>> | null = null;
    while (structuralAttempt < SELECTOR_CONFIG_V056.maxStructuralAttempts) {
      structuralAttempt++;
      try {
        const call = await this.client.call("blind_routing", `${batchId}_S${structuralAttempt}`, { systemInstruction: SELECTOR_SYSTEM_PROMPT_V056, input: buildSelectorInput(cases), schema: selectorSchema(cases[0]!.candidatePlanIds, cases.map((c) => c.id)), profile, timeoutMs: runtime ? SELECTOR_CONFIG_V056.runtimeTimeoutMs : SELECTOR_CONFIG_V056.evaluationTimeoutMs });
        lastCall = call;
        const rows = (call.rawOutput as any)?.decisions;
        if (!Array.isArray(rows) || rows.length !== cases.length) throw new Error("SELECTOR_DECISION_COUNT_MISMATCH");
        const parsed = new Map<string, SelectorDecision>();
        for (const row of rows) { const value = selectorDecisionSchema.parse(row); if (parsed.has(value.id)) throw new Error("DUPLICATE_DECISION_ID"); parsed.set(value.id, value); }
        if (parsed.size !== cases.length || cases.some((c) => !parsed.has(c.id))) throw new Error("MISSING_DECISION_ID");
        return cases.map((item,index) => record(item, parsed.get(item.id)!, call, structuralAttempt, index===0));
      } catch (error) {
        if (structuralAttempt >= SELECTOR_CONFIG_V056.maxStructuralAttempts || error instanceof V0531TransportFailure) return cases.map((item) => failureRecord(item, lastCall, error, structuralAttempt));
      }
    }
    return cases.map((item) => failureRecord(item, lastCall, new Error("SELECTOR_EXHAUSTED"), structuralAttempt));
  }
}

function fallback(item: SelectorCase) { return item.candidatePlanIds.map((id) => planById(id)!).sort((a,b) => b.fallbackPriority-a.fallbackPriority)[0]!.id; }
function record(item: SelectorCase, decision: SelectorDecision, call: any, logicalCalls: number, ownsTelemetry: boolean): SelectorRouteRecord {
  const invalid = !item.candidatePlanIds.includes(decision.planId); const low = decision.confidence === "LOW";
  const selectedPlanId = invalid || low ? fallback(item) : decision.planId;
  return { case:item, decision, selectedPlanId, acceptableHit:item.acceptablePlanIds.includes(selectedPlanId), preferredHit:item.preferredPlanIds.length?item.preferredPlanIds.includes(selectedPlanId):null, invalidPlan:invalid, unsafePlan:!item.candidatePlanIds.includes(selectedPlanId), fallbackUsed:invalid||low, fallbackReason:invalid?"STRUCTURAL_FAILURE":low?"LOW_CONFIDENCE":"NONE", latencyMs:call.latencyMs, fullLatencyMs:call.fullLatencyMs, logicalCalls:ownsTelemetry?logicalCalls:0, httpAttempts:ownsTelemetry?call.attempts.length:0, transportRetries:ownsTelemetry?call.transportRetries:0, attempts:ownsTelemetry?call.attempts:[], usage:ownsTelemetry?call.usage:{inputTokens:0,outputTokens:0,thinkingTokens:0,totalTokens:0}, estimatedCostUsd:ownsTelemetry?call.estimatedCostUsd:0 };
}
function failureRecord(item: SelectorCase, call: any, error: unknown, logicalCalls: number): SelectorRouteRecord {
  const selectedPlanId=fallback(item); const transport=/429|500|503|504|timeout|ECONNRESET|capacity|Vertex/i.test(String((error as Error).message));
  return { case:item, decision:null, selectedPlanId, acceptableHit:item.acceptablePlanIds.includes(selectedPlanId), preferredHit:item.preferredPlanIds.length?item.preferredPlanIds.includes(selectedPlanId):null, invalidPlan:false, unsafePlan:false, fallbackUsed:true, fallbackReason:transport?"TRANSPORT_FAILURE":"STRUCTURAL_FAILURE", latencyMs:call?.latencyMs??null, fullLatencyMs:call?.fullLatencyMs??null, logicalCalls, httpAttempts:call?.attempts?.length??0, transportRetries:call?.transportRetries??0, attempts:call?.attempts??[{outcome:"ERROR",message:String((error as Error).message).slice(0,300)}], usage:call?.usage??{inputTokens:0,outputTokens:0,thinkingTokens:0,totalTokens:0}, estimatedCostUsd:call?.estimatedCostUsd??0 };
}
