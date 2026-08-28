import type { ConversationState, ResponsePlan, UserIntent, UserTurnEnvelope } from "../v05/contracts.js";
import { candidatePlans } from "../v05/policy.js";
import type { RouterIntent, SemanticRoutingEnvelope } from "./contracts.js";
import { classifyClaim } from "./validator.js";

const LEGACY: Record<RouterIntent, UserIntent> = {
  ASK_CAUSE: "INVESTIGATE_CAUSE",
  ASK_SCHEDULE: "FACTUAL_SCHEDULE",
  ASK_LOST_TIME: "FACTUAL_LOST_TIME",
  ASK_CAPABILITY: "QUESTION_CAPABILITY",
  ASK_STATUS: "MISSING_WORK",
  REQUEST_COMPLETION: "REQUEST_ACTION",
  ACCUSE_GENERALIZATION: "ACCUSATION",
  THREAT_ESCALATION: "THREAT",
  PROPOSE_COLLABORATION: "COLLABORATE",
  EXPRESS_FRUSTRATION: "FRUSTRATION",
  PASSIVE_AGGRESSIVE: "PASSIVE_AGGRESSIVE",
  APOLOGIZE: "APOLOGY",
  CHANGE_TOPIC: "CHANGE_TOPIC",
  ACKNOWLEDGE_CONTEXT: "CONCILIATORY",
  ACCEPT_PLAN: "PLAN_ACCEPTANCE",
  ASSERT_CLAIM: "CLARIFICATION",
  META_PROMPT_ATTACK: "PROMPT_INJECTION",
  OUT_OF_SCOPE: "CLARIFICATION",
  AMBIGUOUS: "CLARIFICATION",
  UNCLEAR: "CLARIFICATION",
};

function claimIntent(envelope: SemanticRoutingEnvelope): UserIntent | undefined {
  const types = new Set(envelope.userClaimCandidates.map((c) => c.claimType));
  if (types.has("DEADLINE_CHANGED")) return "FALSE_DEADLINE";
  if (types.has("PRIOR_PROMISE")) return "FALSE_HISTORY";
  if ([...types].some((t) => ["PERSONAL_HEALTH", "PERSONAL_EMPLOYMENT", "OTHER_USER_CLAIM"].includes(t))) return "UNKNOWN_PERSONAL";
  return undefined;
}
function speechAct(envelope: SemanticRoutingEnvelope): UserTurnEnvelope["speechAct"] {
  if (envelope.speechAct === "QUESTION") return "QUESTION";
  if (envelope.speechAct === "REQUEST" || envelope.speechAct === "OFFER") return "REQUEST";
  if (envelope.speechAct === "ACCUSATION") return "ACCUSATION";
  if (envelope.speechAct === "THREAT") return "THREAT";
  if (envelope.speechAct === "ACKNOWLEDGEMENT") return "ACKNOWLEDGEMENT";
  return "ASSERTION";
}

export function candidatePlansFromRouting(
  state: ConversationState,
  locale: "pt-BR" | "en-US",
  text: string,
  envelope: SemanticRoutingEnvelope,
): ResponsePlan[] {
  const intents = new Set<UserIntent>();
  for (const intent of [envelope.primaryIntent, ...envelope.secondaryIntents]) intents.add(LEGACY[intent]);
  const claim = claimIntent(envelope);
  if (claim) intents.add(claim);
  const grounded = envelope.userClaimCandidates.filter((c) => classifyClaim(c.claimType) === "GROUNDED").map((c) => c.claimType);
  const contradicted = envelope.userClaimCandidates.filter((c) => classifyClaim(c.claimType) === "CONTRADICTED").map((c) => c.claimType);
  const unknown = envelope.userClaimCandidates.filter((c) => classifyClaim(c.claimType) === "UNKNOWN").map((c) => c.claimType);
  const plans = new Map<string, ResponsePlan>();
  for (const intent of intents) {
    const input: UserTurnEnvelope = {
      locale,
      text,
      intent,
      speechAct: speechAct(envelope),
      knownClaims: grounded,
      contradictedClaims: contradicted,
      unknownClaims: unknown,
      promptInjection: envelope.metaAttack,
    };
    for (const plan of candidatePlans(state, input)) plans.set(plan.id, plan);
  }
  return [...plans.values()];
}
