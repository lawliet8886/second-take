import type { RouterIntent } from "../v052/contracts.js";
import type { ClarificationDecision, ClarificationGateInput } from "../v053/contracts.js";
import type { NoProbeTrigger, ProbeAmbiguityClass, ProbeSense, ProbeTrigger } from "./contracts.js";

const routerSense = (intent: RouterIntent): ProbeSense | null => {
  switch (intent) {
    case "ASK_CAPABILITY": case "REQUEST_COMPLETION": case "EXPRESS_FRUSTRATION":
    case "ACCUSE_GENERALIZATION": case "PROPOSE_COLLABORATION": case "ASK_STATUS": return intent;
    default: return null;
  }
};

function knownPair(primary: RouterIntent, speechAct: string): { competing: ProbeSense; ambiguityClass: ProbeAmbiguityClass } | null {
  if (primary === "ASK_CAPABILITY") return { competing: "REQUEST_COMPLETION", ambiguityClass: "REQUEST_VS_CAPABILITY" };
  if (primary === "REQUEST_COMPLETION") return { competing: "ASK_CAPABILITY", ambiguityClass: "REQUEST_VS_CAPABILITY" };
  if (primary === "EXPRESS_FRUSTRATION") return { competing: "ACCUSE_SPECIFIC_FAILURE", ambiguityClass: "FRUSTRATION_VS_ACCUSATION_SPECIFIC" };
  if (primary === "ACCUSE_GENERALIZATION") return { competing: "EXPRESS_FRUSTRATION", ambiguityClass: "FRUSTRATION_VS_ACCUSATION_GENERAL" };
  if (primary === "PROPOSE_COLLABORATION") return { competing: "OFFER_HELP", ambiguityClass: "OFFER_VS_COLLABORATION" };
  if (primary === "ASK_STATUS" && ["QUESTION", "REQUEST", "MIXED"].includes(speechAct)) return { competing: "REQUEST_COMPLETION", ambiguityClass: "MULTI_ACT_SCOPE" };
  return null;
}

export function planContrastiveProbe(
  input: ClarificationGateInput,
  baseDecision: ClarificationDecision,
): ProbeTrigger | NoProbeTrigger {
  const envelope = input.envelope;
  if (!envelope) return { invoke: false, reason: "NO_ROUTER_ENVELOPE" };
  if (envelope.metaAttack || envelope.outOfScope) return { invoke: false, reason: "SAFETY_OR_OOS" };
  if (baseDecision.reasons.includes("CLAIM_HEAVY")) return { invoke: false, reason: "CLAIM_HEAVY_STAYS_LOCAL" };

  const primarySense = routerSense(envelope.primaryIntent);
  if (!primarySense) return { invoke: false, reason: "PRIMARY_OUTSIDE_FINITE_FAMILIES" };

  const explicit = envelope.alternativeIntent ? routerSense(envelope.alternativeIntent) : null;
  if (explicit && explicit !== primarySense) return {
    invoke: true,
    primarySense,
    competingSense: explicit,
    ambiguityClass: envelope.ambiguityType === "REQUEST_VS_CAPABILITY" ? "REQUEST_VS_CAPABILITY"
      : envelope.ambiguityType === "FRUSTRATION_VS_ACCUSATION" ? "FRUSTRATION_VS_ACCUSATION_GENERAL"
      : envelope.ambiguityType === "OFFER_VS_COLLABORATION" ? "OFFER_VS_COLLABORATION"
      : "MULTI_ACT_SCOPE",
    triggerReason: "ENVELOPE_ALTERNATIVE",
  };

  if (envelope.speechAct === "MIXED") {
    const secondary = envelope.secondaryIntents.map(routerSense).find((sense): sense is ProbeSense => Boolean(sense) && sense !== primarySense);
    if (secondary) return { invoke: true, primarySense, competingSense: secondary, ambiguityClass: "MULTI_ACT_SCOPE", triggerReason: "MIXED_RELEVANT_ACT" };
  }

  const pair = knownPair(envelope.primaryIntent, envelope.speechAct);
  if (pair) return { invoke: true, primarySense, competingSense: pair.competing, ambiguityClass: pair.ambiguityClass, triggerReason: "KNOWN_CONFUSION_FAMILY" };

  if (baseDecision.reasons.some((reason) => ["MATERIAL_INTENT_AMBIGUITY", "MULTI_INTENT_CONFLICT", "ROUTER_LOW_CONFIDENCE"].includes(reason))) {
    const fallback = knownPair(envelope.primaryIntent, "MIXED");
    if (fallback) return { invoke: true, primarySense, competingSense: fallback.competing, ambiguityClass: fallback.ambiguityClass, triggerReason: "WEAK_GATE_SIGNAL" };
  }
  return { invoke: false, reason: "NO_FINITE_CONTRAST_TRIGGER" };
}
