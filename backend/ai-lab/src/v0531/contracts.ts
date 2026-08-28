import type { ConversationState } from "../v05/contracts.js";
import type { RouterIntent } from "../v052/contracts.js";
import type { SemanticRoutingEnvelopeV0521 } from "../v0521/contracts.js";
import type { ClarificationDecision, ClarificationGateInput } from "../v053/contracts.js";

export const PROBE_SENSES = [
  "ASK_CAPABILITY",
  "REQUEST_COMPLETION",
  "EXPRESS_FRUSTRATION",
  "ACCUSE_GENERALIZATION",
  "ACCUSE_SPECIFIC_FAILURE",
  "OFFER_HELP",
  "PROPOSE_COLLABORATION",
  "ASK_STATUS",
] as const;
export type ProbeSense = (typeof PROBE_SENSES)[number];

export const PROBE_AMBIGUITY_CLASSES = [
  "REQUEST_VS_CAPABILITY",
  "FRUSTRATION_VS_ACCUSATION_GENERAL",
  "FRUSTRATION_VS_ACCUSATION_SPECIFIC",
  "OFFER_VS_COLLABORATION",
  "MULTI_ACT_SCOPE",
] as const;
export type ProbeAmbiguityClass = (typeof PROBE_AMBIGUITY_CLASSES)[number];

export type ContrastiveProbeRequest = {
  id: string;
  locale: "pt-BR" | "en-US";
  userText: string;
  primarySense: ProbeSense;
  competingSense: ProbeSense;
  ambiguityClass: ProbeAmbiguityClass;
  context: {
    tension: ConversationState["tension"];
    openness: ConversationState["openness"];
    resolutionStage: ConversationState["resolutionStage"];
  };
};

export type ContrastiveProbeResult = {
  id: string;
  alternativeIsMateriallyPlausible: boolean;
  ambiguityClass: ProbeAmbiguityClass;
  confidence: "HIGH" | "MEDIUM" | "LOW";
};

export type ProbeTrigger = {
  invoke: true;
  primarySense: ProbeSense;
  competingSense: ProbeSense;
  ambiguityClass: ProbeAmbiguityClass;
  triggerReason:
    | "KNOWN_CONFUSION_FAMILY"
    | "MIXED_RELEVANT_ACT"
    | "CONFLICTING_SECONDARY"
    | "ENVELOPE_ALTERNATIVE"
    | "WEAK_GATE_SIGNAL";
};

export type NoProbeTrigger = { invoke: false; reason: string };

export type ContrastiveOption = {
  id: string;
  sense: ProbeSense;
  resolvedRouterIntent: RouterIntent;
  candidatePlanIds: string[];
  label: { "pt-BR": string; "en-US": string };
};

export type V0531GateInput = ClarificationGateInput & {
  baseDecision: ClarificationDecision;
  probeTrigger: ProbeTrigger | NoProbeTrigger;
  probeResult: ContrastiveProbeResult | null;
  probeFailure?: "TRANSPORT" | "SCHEMA" | "TIMEOUT" | null;
};

export type V0531GateDecision = ClarificationDecision & {
  probeInvoked: boolean;
  probeFailure: V0531GateInput["probeFailure"];
  contrastiveOptions: ContrastiveOption[];
  materialCandidateDifference: boolean;
  probeAlternativePlausible: boolean | null;
};

export type RoutedProbeInput = {
  id: string;
  locale: "pt-BR" | "en-US";
  text: string;
  envelope: SemanticRoutingEnvelopeV0521;
};

