import type { RouterIntent } from "./contracts.js";

export const INTENT_DEFINITIONS_V0521: Record<RouterIntent, string> = {
  ASK_STATUS: "asks what work remains unfinished or what the current task status is",
  ASK_CAUSE: "asks what happened, what obstacle existed, or why progress is delayed without asserting an answer",
  ASK_SCHEDULE: "asks whether or how Alex's internship schedule changed",
  ASK_LOST_TIME: "asks how much work time or how many evenings Alex lost",
  ASK_CAPABILITY: "genuinely asks what Alex can realistically finish; do not use for a clearly directive polite request",
  REQUEST_COMPLETION: "asks or directs Alex to finish or send project work, including a clearly polite indirect request",
  ACCUSE_GENERALIZATION: "makes a broad always/never judgment about Alex's effort, reliability, or character",
  THREAT_ESCALATION: "threatens professor escalation, public blame, removal, or another consequence",
  PROPOSE_COLLABORATION: "offers help or proposes joint action on the remaining project work",
  EXPRESS_FRUSTRATION: "explicitly expresses stress, fatigue, disappointment, or frustration without a stronger primary move",
  PASSIVE_AGGRESSIVE: "uses sarcasm, martyrdom, or indirect blame, such as implying the user must do Alex's work again",
  APOLOGIZE: "apologizes or admits that the user's tone or behavior was unfair",
  CHANGE_TOPIC: "pauses, dismisses, ends, or changes away from the project conversation",
  ACKNOWLEDGE_CONTEXT: "explicitly acknowledges Alex's perspective or attempts a constructive conversational reset",
  ACCEPT_PLAN: "accepts a plan or division of work already proposed",
  ASSERT_CLAIM: "presents a checkable proposition as true, probable, or part of the world; questions, requests, wishes and hypotheticals are not assertions",
  META_PROMPT_ATTACK: "asks for system instructions, role change, hidden facts, free text, or a forced plan ID",
  OUT_OF_SCOPE: "contains content genuinely unrelated to this teammate/project conversation",
  AMBIGUOUS: "legacy representation for an unresolved material ambiguity; v0.5.2.1 normally keeps the best primary reading and records one alternative",
  UNCLEAR: "is too incomplete or incoherent to identify a useful intent",
};

export const ROUTER_CONTRASTS_V0521 = [
  "ASK_CAPABILITY asks whether something is realistically possible; REQUEST_COMPLETION asks Alex to do it.",
  "A modal question can genuinely support both readings. If neither dominates, keep the best primary reading, set one alternativeIntent, ambiguous=true, confidence=LOW, and choose the matching ambiguityType.",
  "EXPRESS_FRUSTRATION is secondary only when frustration is independently expressed in words; tone alone is not a secondary intent.",
  "ACCUSE_GENERALIZATION requires an actual broad judgment; frustration or skepticism alone is not an accusation.",
  "PROPOSE_COLLABORATION requires an offer or joint proposal; merely sounding supportive is insufficient.",
  "ASSERT_CLAIM requires a proposition presented as factual or epistemically likely. A question, requested action, wish, conditional antecedent, or hypothetical consequent is not automatically a claim.",
  "A presupposition in a question is not automatically a userClaimCandidate. Extract only independently asserted material.",
];

export const CONFIDENCE_RUBRIC = {
  HIGH: "One interpretation clearly dominates and no materially different alternative remains plausible.",
  MEDIUM: "Some nuance is uncertain, but plausible readings lead to the same intent family and substantially the same policy behavior.",
  LOW: "Two materially different interpretations remain plausible and would change family, candidate plans, factual validation, or Alex's response.",
} as const;

export const AMBIGUITY_RUBRIC = {
  NOT_AMBIGUOUS: "One interpretation dominates; stylistic nuance, slang, errors, indirectness, or ordinary multi-intent wording alone do not make it ambiguous.",
  AMBIGUOUS: "At least two materially different readings remain plausible and would produce different policy behavior, factual validation, or a significantly different response.",
} as const;
