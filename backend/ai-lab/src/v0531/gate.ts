import type { RouterIntent } from "../v052/contracts.js";
import type { ClarificationReason } from "../v053/contracts.js";
import { intentLabel } from "../v053/ux.js";
import type { ContrastiveOption, ProbeSense, V0531GateDecision, V0531GateInput } from "./contracts.js";
import { compareMateriality, ROUTER_INTENT_FOR_SENSE } from "./materiality.js";

const specialLabels: Partial<Record<ProbeSense, { "pt-BR": string; "en-US": string }>> = {
  OFFER_HELP: { "pt-BR": "Quero oferecer minha ajuda ao Alex.", "en-US": "I want to offer Alex my help." },
  ACCUSE_SPECIFIC_FAILURE: { "pt-BR": "Quero dizer que esta falha específica foi do Alex.", "en-US": "I want to say this specific failure was Alex's." },
};
const option = (input: V0531GateInput, sense: ProbeSense, plans: string[], index: number): ContrastiveOption => ({ id: `CONTRAST_${index + 1}`, sense, resolvedRouterIntent: ROUTER_INTENT_FOR_SENSE[sense], candidatePlanIds: plans, label: specialLabels[sense] ?? intentLabel(sense as RouterIntent) });
const filteredReasons = (reasons: ClarificationReason[]) => reasons.filter((reason) => !["MATERIAL_INTENT_AMBIGUITY", "ROUTER_LOW_CONFIDENCE"].includes(reason));

export class ContrastiveClarificationGate {
  decide(input: V0531GateInput): V0531GateDecision {
    const base = input.baseDecision;
    if (!input.probeTrigger.invoke) return { ...base, probeInvoked: false, probeFailure: null, contrastiveOptions: [], materialCandidateDifference: false, probeAlternativePlausible: null };
    if (!input.envelope) return { ...base, disposition: "TRANSPORT_FAILURE", probeInvoked: true, probeFailure: input.probeFailure ?? "SCHEMA", contrastiveOptions: [], materialCandidateDifference: false, probeAlternativePlausible: null };
    const comparison = compareMateriality({ locale: input.locale, text: input.userText, envelope: input.envelope, state: input.currentState }, input.probeTrigger.primarySense, input.probeTrigger.competingSense);
    if (input.probeFailure || !input.probeResult) {
      const hasMeaningfulLocalSignal = base.disposition === "NEEDS_CLARIFICATION" && base.reasons.some((reason) => ["MATERIAL_INTENT_AMBIGUITY", "MULTI_INTENT_CONFLICT", "UNCLEAR_REFERENCE"].includes(reason));
      return { ...base, disposition: hasMeaningfulLocalSignal ? "NEEDS_CLARIFICATION" : "TRANSPORT_FAILURE", probeInvoked: true, probeFailure: input.probeFailure ?? "SCHEMA", contrastiveOptions: [], materialCandidateDifference: comparison.material, probeAlternativePlausible: null };
    }
    const clarify = input.probeResult.alternativeIsMateriallyPlausible && comparison.material;
    if (clarify) {
      const options = [option(input, input.probeTrigger.primarySense, comparison.primaryPlans, 0), option(input, input.probeTrigger.competingSense, comparison.alternativePlans, 1)];
      return { ...base, disposition: "NEEDS_CLARIFICATION", reasons: [...new Set([...filteredReasons(base.reasons), "MATERIAL_INTENT_AMBIGUITY" as const])], resolvedIntent: null, options: [], candidateDivergence: comparison.divergence, probeInvoked: true, probeFailure: null, contrastiveOptions: options, materialCandidateDifference: true, probeAlternativePlausible: true };
    }
    const remaining = filteredReasons(base.reasons);
    if (remaining.length) return { ...base, reasons: remaining, probeInvoked: true, probeFailure: null, contrastiveOptions: [], materialCandidateDifference: comparison.material, probeAlternativePlausible: input.probeResult.alternativeIsMateriallyPlausible };
    return { ...base, disposition: "CLEAR", reasons: [], resolvedIntent: input.envelope.primaryIntent, options: [], candidateDivergence: comparison.divergence, probeInvoked: true, probeFailure: null, contrastiveOptions: [], materialCandidateDifference: comparison.material, probeAlternativePlausible: input.probeResult.alternativeIsMateriallyPlausible };
  }
}

