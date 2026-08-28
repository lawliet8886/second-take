import { initialState } from "../v05/policy.js";
import type { ConversationState } from "../v05/contracts.js";
import type { RouterIntent } from "../v052/contracts.js";
import { candidatePlansFromRouting } from "../v052/policy.js";
import { projectEnvelopeForFrozenPolicy } from "../v0521/router.js";
import type { SemanticRoutingEnvelopeV0521 } from "../v0521/contracts.js";
import type { ProbeSense } from "./contracts.js";

const PROBE_ONLY_PLAN_SUBSETS: Record<"OFFER_HELP" | "ACCUSE_SPECIFIC_FAILURE", string[]> = {
  OFFER_HELP: ["PLAN_ACKNOWLEDGE_CONCERN", "PLAN_ASK_USER_NEEDS", "PLAN_ASK_HELP_ANALYSIS"],
  ACCUSE_SPECIFIC_FAILURE: ["PLAN_ACKNOWLEDGE_DELAY", "PLAN_ACCEPT_PARTIAL_RESPONSIBILITY", "PLAN_DEESCALATE_RETURN_TASK"],
};

export const ROUTER_INTENT_FOR_SENSE: Record<ProbeSense, RouterIntent> = {
  ASK_CAPABILITY: "ASK_CAPABILITY",
  REQUEST_COMPLETION: "REQUEST_COMPLETION",
  EXPRESS_FRUSTRATION: "EXPRESS_FRUSTRATION",
  ACCUSE_GENERALIZATION: "ACCUSE_GENERALIZATION",
  ACCUSE_SPECIFIC_FAILURE: "EXPRESS_FRUSTRATION",
  OFFER_HELP: "PROPOSE_COLLABORATION",
  PROPOSE_COLLABORATION: "PROPOSE_COLLABORATION",
  ASK_STATUS: "ASK_STATUS",
};

export function candidatePlansForSense(input: {
  locale: "pt-BR" | "en-US";
  text: string;
  envelope: SemanticRoutingEnvelopeV0521;
  state?: ConversationState;
}, sense: ProbeSense): string[] {
  const routerIntent = ROUTER_INTENT_FOR_SENSE[sense];
  const projected = projectEnvelopeForFrozenPolicy({
    ...input.envelope,
    primaryIntent: routerIntent,
    alternativeIntent: null,
    ambiguityType: "NONE",
    secondaryIntents: [],
    confidence: "HIGH",
    ambiguous: false,
  });
  const plans = candidatePlansFromRouting(input.state ?? initialState(), input.locale, input.text, projected).map((plan) => plan.id);
  if (sense === "OFFER_HELP" || sense === "ACCUSE_SPECIFIC_FAILURE") {
    const allowed = new Set(PROBE_ONLY_PLAN_SUBSETS[sense]);
    return plans.filter((plan) => allowed.has(plan));
  }
  return plans;
}

export function candidateDivergence(left: string[], right: string[]): number {
  const a = new Set(left), b = new Set(right), union = new Set([...a, ...b]);
  if (!union.size) return 0;
  const shared = [...a].filter((id) => b.has(id)).length;
  return 1 - shared / union.size;
}

export function compareMateriality(input: {
  locale: "pt-BR" | "en-US";
  text: string;
  envelope: SemanticRoutingEnvelopeV0521;
  state?: ConversationState;
}, primary: ProbeSense, alternative: ProbeSense) {
  const primaryPlans = candidatePlansForSense(input, primary);
  const alternativePlans = candidatePlansForSense(input, alternative);
  const divergence = candidateDivergence(primaryPlans, alternativePlans);
  return {
    primaryPlans,
    alternativePlans,
    divergence,
    material: primary !== alternative && primaryPlans.length > 0 && alternativePlans.length > 0 && divergence >= 0.45,
  };
}

