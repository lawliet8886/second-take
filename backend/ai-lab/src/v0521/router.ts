import type { ModelProfile } from "../contracts/results.js";
import type { SemanticRoutingEnvelope } from "../v052/contracts.js";
import { V0521ApiClient, type V0521Stage } from "./api-client.js";
import type { TransportAttempt } from "./api-client.js";
import {
  AMBIGUITY_TYPES,
  CLAIM_TYPES,
  FAMILY_BY_INTENT,
  INTENT_FAMILIES,
  PRIMARY_INTENTS,
  SPEECH_ACTS,
  STANCES,
  TARGETS,
  TONES,
  type RoutedCaseV0521,
  type RouterInputV0521,
  type SemanticRoutingEnvelopeV0521,
} from "./contracts.js";
import { ROUTER_MODEL_CONFIG_V0521, ROUTER_SYSTEM_PROMPT_V0521 } from "./prompt.js";
import { routerBatchSchemaV0521 } from "./schema.js";
import { validateEnvelopeV0521 } from "./validator.js";

const member = <T extends readonly string[]>(list: T, value: unknown): value is T[number] =>
  typeof value === "string" && (list as readonly string[]).includes(value);

const derivedStance = (intent: string): SemanticRoutingEnvelopeV0521["stance"] =>
  intent === "THREAT_ESCALATION" ? "THREATENING"
    : ["ACCUSE_GENERALIZATION", "PASSIVE_AGGRESSIVE"].includes(intent) ? "ACCUSATORY"
      : intent === "EXPRESS_FRUSTRATION" ? "FRUSTRATED"
        : ["PROPOSE_COLLABORATION", "ACKNOWLEDGE_CONTEXT", "APOLOGIZE"].includes(intent) ? "COLLABORATIVE"
          : "NEUTRAL";
const derivedTone = (intent: string): SemanticRoutingEnvelopeV0521["tone"] =>
  ["THREAT_ESCALATION", "ACCUSE_GENERALIZATION"].includes(intent) ? "HARSH"
    : ["APOLOGIZE", "ACKNOWLEDGE_CONTEXT"].includes(intent) ? "SOFT" : "DIRECT";
const derivedTarget = (intent: string): SemanticRoutingEnvelopeV0521["target"] => {
  if (["ASK_SCHEDULE"].includes(intent)) return "SCHEDULE";
  if (["ASK_CAPABILITY"].includes(intent)) return "CAPABILITY";
  if (["ASK_CAUSE"].includes(intent)) return "OBSTACLE";
  if (["THREAT_ESCALATION"].includes(intent)) return "PROFESSOR";
  if (["META_PROMPT_ATTACK"].includes(intent)) return "META_SYSTEM";
  if (["ACCUSE_GENERALIZATION", "PASSIVE_AGGRESSIVE"].includes(intent)) return "ALEX_BEHAVIOR";
  if (["OUT_OF_SCOPE", "CHANGE_TOPIC", "UNCLEAR"].includes(intent)) return "OTHER";
  return "UNFINISHED_WORK";
};

export function parseEnvelopeV0521(value: any): SemanticRoutingEnvelopeV0521 {
  if (!value || !member(PRIMARY_INTENTS, value.primaryIntent)) throw new Error("INVALID_PRIMARY_INTENT");
  if (value.alternativeIntent !== null && !member(PRIMARY_INTENTS, value.alternativeIntent)) throw new Error("INVALID_ALTERNATIVE_INTENT");
  if (!member(AMBIGUITY_TYPES, value.ambiguityType)) throw new Error("INVALID_AMBIGUITY_TYPE");
  if (!Array.isArray(value.secondaryIntents) || value.secondaryIntents.some((item: unknown) => !member(PRIMARY_INTENTS, item)))
    throw new Error("INVALID_SECONDARY_INTENTS");
  const finiteFields = [["speechAct", SPEECH_ACTS]] as const;
  for (const [field, allowed] of finiteFields) {
    if (!member(allowed, value[field])) throw new Error(`INVALID_ROUTER_ENUM:${field}:${String(value[field])}`);
  }
  if (!Array.isArray(value.userClaimCandidates) || value.userClaimCandidates.some((claim: any) => !member(CLAIM_TYPES, claim?.claimType) || typeof claim?.sourceSpan !== "string"))
    throw new Error("INVALID_CLAIMS");
  if (!["HIGH", "MEDIUM", "LOW"].includes(value.confidence)) throw new Error("INVALID_CONFIDENCE");
  for (const key of ["ambiguous"])
    if (typeof value[key] !== "boolean") throw new Error(`INVALID_BOOLEAN:${key}`);

  value.intentFamily = FAMILY_BY_INTENT[value.primaryIntent as keyof typeof FAMILY_BY_INTENT];
  value.stance = derivedStance(value.primaryIntent);
  value.tone = derivedTone(value.primaryIntent);
  value.target = derivedTarget(value.primaryIntent);
  value.references = [];
  value.metaAttack = value.primaryIntent === "META_PROMPT_ATTACK" || value.secondaryIntents.includes("META_PROMPT_ATTACK");
  value.outOfScope = value.primaryIntent === "OUT_OF_SCOPE";
  value.secondaryIntents = [...new Set(value.secondaryIntents.filter((item: string) => item !== value.primaryIntent && item !== value.alternativeIntent))];
  return value as SemanticRoutingEnvelopeV0521;
}

export function projectEnvelopeForFrozenPolicy(
  envelope: SemanticRoutingEnvelopeV0521,
): SemanticRoutingEnvelope {
  if (envelope.ambiguous) {
    return {
      primaryIntent: "AMBIGUOUS",
      secondaryIntents: [],
      intentFamily: FAMILY_BY_INTENT.AMBIGUOUS,
      speechAct: envelope.speechAct,
      stance: envelope.stance,
      tone: envelope.tone,
      target: envelope.target,
      userClaimCandidates: [],
      references: envelope.references,
      metaAttack: false,
      outOfScope: false,
      confidence: "LOW",
      ambiguous: true,
    };
  }
  return {
    primaryIntent: envelope.primaryIntent,
    secondaryIntents: envelope.secondaryIntents,
    intentFamily: envelope.intentFamily,
    speechAct: envelope.speechAct,
    stance: envelope.stance,
    tone: envelope.tone,
    target: envelope.target,
    userClaimCandidates: envelope.userClaimCandidates,
    references: envelope.references,
    metaAttack: envelope.metaAttack,
    outOfScope: envelope.outOfScope,
    confidence: envelope.confidence,
    ambiguous: false,
  };
}

export type RouterBatchResultV0521 = {
  routes: RoutedCaseV0521[];
  usage: any;
  latencyMs: number;
  estimatedCostUsd: number;
  transportRetries: number;
  attempts: TransportAttempt[];
  fullLatencyMs: number;
  semanticRetry: number;
};

export async function routeBatchV0521(
  client: V0521ApiClient,
  stage: V0521Stage,
  batchId: string,
  inputs: RouterInputV0521[],
): Promise<RouterBatchResultV0521> {
  const profile: ModelProfile = {
    id: "v0521-router-low",
    role: "simulator",
    thinkingLevel: ROUTER_MODEL_CONFIG_V0521.thinking,
    maxOutputTokens: ROUTER_MODEL_CONFIG_V0521.maxOutputTokens,
    samplingNote: "Finite calibrated semantic routing; no deprecated sampling controls.",
  };
  let last: unknown;
  for (let semanticRetry = 0; semanticRetry < 2; semanticRetry++) {
    const call = await client.call(stage, `${batchId}${semanticRetry ? "_schema-retry" : ""}`, {
      systemInstruction: ROUTER_SYSTEM_PROMPT_V0521,
      input: JSON.stringify({
        scenario: "Alex is the user's teammate. Two research slides are unfinished and the presentation deadline is Friday.",
        items: inputs,
        instruction: "Return exactly one route per item, preserving each id. Claim and reference spans must be exact contiguous substrings of that item's text.",
        ...(semanticRetry ? { repair: "The previous output violated the finite schema or exact-span contract. Return one fully valid replacement without changing the input." } : {}),
      }),
      schema: routerBatchSchemaV0521(inputs.map((input) => input.id)),
      profile,
      timeoutMs: 180_000,
    });
    try {
      const raw: any = call.rawOutput;
      if (!Array.isArray(raw?.routes) || raw.routes.length !== inputs.length) throw new Error("ROUTE_COUNT_MISMATCH");
      const seen = new Set<string>();
      const routes = raw.routes.map((row: any) => {
        if (typeof row?.id !== "string" || seen.has(row.id)) throw new Error("INVALID_OR_DUPLICATE_ROUTE_ID");
        const input = inputs.find((candidate) => candidate.id === row.id);
        if (!input) throw new Error("UNKNOWN_ROUTE_ID");
        seen.add(row.id);
        const envelope = parseEnvelopeV0521(row.envelope);
        const validation = validateEnvelopeV0521(input.text, envelope);
        if (!validation.valid) throw new Error(`ENVELOPE_CONTRACT:${validation.violations.join("|")}`);
        return { ...input, envelope };
      });
      return {
        routes,
        usage: call.usage,
        latencyMs: call.latencyMs,
        estimatedCostUsd: call.estimatedCostUsd,
        transportRetries: call.transportRetries,
        attempts: call.attempts,
        fullLatencyMs: call.fullLatencyMs,
        semanticRetry,
      };
    } catch (error) {
      last = error;
      if (semanticRetry === 1) throw error;
    }
  }
  throw last;
}

export async function routeSingleV0521(
  client: V0521ApiClient,
  stage: V0521Stage,
  requestId: string,
  input: RouterInputV0521,
): Promise<RouterBatchResultV0521> {
  return routeBatchV0521(client, stage, requestId, [input]);
}

export const routeBatch = routeBatchV0521;
export const routeSingle = routeSingleV0521;
