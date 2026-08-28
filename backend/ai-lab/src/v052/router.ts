import type { ModelProfile } from "../contracts/results.js";
import { V052ApiClient, type V052Stage } from "./api-client.js";
import {
  CLAIM_TYPES,
  FAMILY_BY_INTENT,
  INTENT_FAMILIES,
  PRIMARY_INTENTS,
  SPEECH_ACTS,
  STANCES,
  TARGETS,
  TONES,
  type RoutedCase,
  type SemanticRoutingEnvelope,
} from "./contracts.js";
import { ROUTER_MODEL_CONFIG, ROUTER_SYSTEM_PROMPT } from "./prompt.js";
import { routerBatchSchema } from "./schema.js";
import { validateEnvelope } from "./validator.js";

const member = <T extends readonly string[]>(list: T, value: unknown): value is T[number] =>
  typeof value === "string" && (list as readonly string[]).includes(value);

function parseEnvelope(value: any): SemanticRoutingEnvelope {
  if (!value || !member(PRIMARY_INTENTS, value.primaryIntent)) throw new Error("INVALID_PRIMARY_INTENT");
  if (!Array.isArray(value.secondaryIntents) || value.secondaryIntents.some((x: unknown) => !member(PRIMARY_INTENTS, x))) throw new Error("INVALID_SECONDARY_INTENTS");
  const aliases: Record<string, Record<string, string>> = {
    stance: { DIRECT: "NEUTRAL", DIRECTIVE: "NEUTRAL", HARSH: "ACCUSATORY", CALM: "NEUTRAL" },
    tone: { NEUTRAL: "CALM", POLITE: "SOFT", FRUSTRATED: "HARSH", ACCUSATORY: "HARSH" },
    target: { TASK: "UNFINISHED_WORK", WORK: "UNFINISHED_WORK", SLIDES: "UNFINISHED_WORK", ALEX: "ALEX_BEHAVIOR" },
  };
  for (const [field, fieldAliases] of Object.entries(aliases)) {
    if (typeof value[field] === "string" && fieldAliases[value[field]]) value[field] = fieldAliases[value[field]];
  }
  const finiteFields = [
    ["intentFamily", INTENT_FAMILIES],
    ["speechAct", SPEECH_ACTS],
    ["stance", STANCES],
    ["tone", TONES],
    ["target", TARGETS],
  ] as const;
  for (const [field, allowed] of finiteFields) {
    if (!member(allowed, value[field])) throw new Error(`INVALID_ROUTER_ENUM:${field}:${String(value[field])}`);
  }
  if (!Array.isArray(value.userClaimCandidates) || value.userClaimCandidates.some((c: any) => !member(CLAIM_TYPES, c?.claimType) || typeof c?.sourceSpan !== "string")) throw new Error("INVALID_CLAIMS");
  if (!Array.isArray(value.references) || value.references.some((x: unknown) => typeof x !== "string")) throw new Error("INVALID_REFERENCES");
  if (!["HIGH", "MEDIUM", "LOW"].includes(value.confidence)) throw new Error("INVALID_CONFIDENCE");
  for (const key of ["metaAttack", "outOfScope", "ambiguous"])
    if (typeof value[key] !== "boolean") throw new Error(`INVALID_BOOLEAN:${key}`);
  // These fields are deterministic projections of the chosen primary intent.
  // Canonicalizing them locally prevents redundant model output from becoming
  // a second, conflicting source of semantic truth.
  value.intentFamily = FAMILY_BY_INTENT[value.primaryIntent as keyof typeof FAMILY_BY_INTENT];
  value.metaAttack = value.primaryIntent === "META_PROMPT_ATTACK" || value.secondaryIntents.includes("META_PROMPT_ATTACK");
  value.outOfScope = value.primaryIntent === "OUT_OF_SCOPE";
  value.ambiguous = value.primaryIntent === "AMBIGUOUS";
  value.secondaryIntents = [...new Set(value.secondaryIntents.filter((x: string) => x !== value.primaryIntent))];
  return value as SemanticRoutingEnvelope;
}

export type RouterInput = { id: string; locale: "pt-BR" | "en-US"; text: string };
export type RouterBatchResult = {
  routes: RoutedCase[];
  usage: any;
  latencyMs: number;
  estimatedCostUsd: number;
  transportRetries: number;
  semanticRetry: number;
};

export async function routeBatch(
  client: V052ApiClient,
  stage: V052Stage,
  batchId: string,
  inputs: RouterInput[],
): Promise<RouterBatchResult> {
  const profile: ModelProfile = {
    id: "v052-router-low",
    role: "simulator",
    thinkingLevel: ROUTER_MODEL_CONFIG.thinking,
    maxOutputTokens: ROUTER_MODEL_CONFIG.maxOutputTokens,
    samplingNote: "Finite semantic routing; no deprecated sampling controls.",
  };
  let last: unknown;
  for (let semanticRetry = 0; semanticRetry < 2; semanticRetry++) {
    const call = await client.call(stage, `${batchId}${semanticRetry ? "_schema-retry" : ""}`, {
      systemInstruction: ROUTER_SYSTEM_PROMPT,
      input: JSON.stringify({
        scenario: "Alex is the user's teammate. Two research slides are unfinished and the presentation deadline is Friday.",
        items: inputs,
        instruction: "Return exactly one route per item, preserving each id. Source spans and reference spans must be exact contiguous substrings of that item's text.",
        ...(semanticRetry ? { repair: "The previous output violated the finite schema or exact-span contract. Return a fully valid replacement without changing the input." } : {}),
      }),
      schema: routerBatchSchema(inputs.map((x) => x.id)),
      profile,
      timeoutMs: 180_000,
    });
    try {
      const raw: any = call.rawOutput;
      if (!Array.isArray(raw?.routes) || raw.routes.length !== inputs.length) throw new Error("ROUTE_COUNT_MISMATCH");
      const seen = new Set<string>();
      const routes = raw.routes.map((row: any) => {
        if (typeof row?.id !== "string" || seen.has(row.id)) throw new Error("INVALID_OR_DUPLICATE_ROUTE_ID");
        const input = inputs.find((x) => x.id === row.id);
        if (!input) throw new Error("UNKNOWN_ROUTE_ID");
        seen.add(row.id);
        const envelope = parseEnvelope(row.envelope);
        const validation = validateEnvelope(input.text, envelope);
        if (!validation.valid) throw new Error(`ENVELOPE_CONTRACT:${validation.violations.join("|")}`);
        if (FAMILY_BY_INTENT[envelope.primaryIntent] !== envelope.intentFamily) throw new Error("FAMILY_MISMATCH");
        return { ...input, envelope };
      });
      return { routes, usage: call.usage, latencyMs: call.latencyMs, estimatedCostUsd: call.estimatedCostUsd, transportRetries: call.transportRetries, semanticRetry };
    } catch (error) {
      last = error;
      if (semanticRetry === 1) throw error;
    }
  }
  throw last;
}
