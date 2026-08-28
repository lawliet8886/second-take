export const PRIMARY_INTENTS = [
  "ASK_STATUS",
  "ASK_CAUSE",
  "ASK_SCHEDULE",
  "ASK_LOST_TIME",
  "ASK_CAPABILITY",
  "REQUEST_COMPLETION",
  "ACCUSE_GENERALIZATION",
  "THREAT_ESCALATION",
  "PROPOSE_COLLABORATION",
  "EXPRESS_FRUSTRATION",
  "PASSIVE_AGGRESSIVE",
  "APOLOGIZE",
  "CHANGE_TOPIC",
  "ACKNOWLEDGE_CONTEXT",
  "ACCEPT_PLAN",
  "ASSERT_CLAIM",
  "META_PROMPT_ATTACK",
  "OUT_OF_SCOPE",
  "AMBIGUOUS",
  "UNCLEAR",
] as const;
export type RouterIntent = (typeof PRIMARY_INTENTS)[number];

export const INTENT_FAMILIES = [
  "INFORMATION_SEEKING",
  "TASK_REQUEST",
  "CONFRONTATION",
  "COLLABORATION",
  "REPAIR_OR_ACKNOWLEDGEMENT",
  "CONVERSATION_CONTROL",
  "CLAIM_ASSERTION",
  "META_ATTACK",
  "OUT_OF_SCOPE",
  "AMBIGUOUS_OR_UNCLEAR",
] as const;
export type IntentFamily = (typeof INTENT_FAMILIES)[number];

export const FAMILY_BY_INTENT: Record<RouterIntent, IntentFamily> = {
  ASK_STATUS: "INFORMATION_SEEKING",
  ASK_CAUSE: "INFORMATION_SEEKING",
  ASK_SCHEDULE: "INFORMATION_SEEKING",
  ASK_LOST_TIME: "INFORMATION_SEEKING",
  ASK_CAPABILITY: "INFORMATION_SEEKING",
  REQUEST_COMPLETION: "TASK_REQUEST",
  ACCUSE_GENERALIZATION: "CONFRONTATION",
  THREAT_ESCALATION: "CONFRONTATION",
  EXPRESS_FRUSTRATION: "CONFRONTATION",
  PASSIVE_AGGRESSIVE: "CONFRONTATION",
  PROPOSE_COLLABORATION: "COLLABORATION",
  APOLOGIZE: "REPAIR_OR_ACKNOWLEDGEMENT",
  ACKNOWLEDGE_CONTEXT: "REPAIR_OR_ACKNOWLEDGEMENT",
  ACCEPT_PLAN: "REPAIR_OR_ACKNOWLEDGEMENT",
  CHANGE_TOPIC: "CONVERSATION_CONTROL",
  ASSERT_CLAIM: "CLAIM_ASSERTION",
  META_PROMPT_ATTACK: "META_ATTACK",
  OUT_OF_SCOPE: "OUT_OF_SCOPE",
  AMBIGUOUS: "AMBIGUOUS_OR_UNCLEAR",
  UNCLEAR: "AMBIGUOUS_OR_UNCLEAR",
};

export const SPEECH_ACTS = [
  "ASSERTION",
  "QUESTION",
  "REQUEST",
  "ACCUSATION",
  "THREAT",
  "OFFER",
  "ACKNOWLEDGEMENT",
  "CORRECTION",
  "META",
  "MIXED",
] as const;
export const STANCES = [
  "NEUTRAL",
  "CURIOUS",
  "COLLABORATIVE",
  "FRUSTRATED",
  "ACCUSATORY",
  "PASSIVE_AGGRESSIVE",
  "THREATENING",
  "DISMISSIVE",
  "SUPPORTIVE",
  "SKEPTICAL",
] as const;
export const TONES = [
  "CALM",
  "DIRECT",
  "SOFT",
  "HARSH",
  "SARCASTIC",
  "UNCERTAIN",
] as const;
export const TARGETS = [
  "UNFINISHED_WORK",
  "DEADLINE",
  "ALEX_EFFORT",
  "ALEX_BEHAVIOR",
  "CAPABILITY",
  "OBSTACLE",
  "SCHEDULE",
  "PROFESSOR",
  "PROJECT",
  "USER_WORKLOAD",
  "RELATIONSHIP",
  "META_SYSTEM",
  "OTHER",
] as const;
export const CLAIM_TYPES = [
  "DEADLINE_CHANGED",
  "PRIOR_PROMISE",
  "PERSONAL_HEALTH",
  "PERSONAL_EMPLOYMENT",
  "SCHEDULE_CHANGED",
  "SLIDES_UNFINISHED",
  "DEADLINE_FRIDAY",
  "OTHER_USER_CLAIM",
] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];
export type GroundingStatus = "GROUNDED" | "CONTRADICTED" | "UNKNOWN";

export type RouterClaim = {
  claimType: ClaimType;
  sourceSpan: string;
};
export type SemanticRoutingEnvelope = {
  primaryIntent: RouterIntent;
  secondaryIntents: RouterIntent[];
  intentFamily: IntentFamily;
  speechAct: (typeof SPEECH_ACTS)[number];
  stance: (typeof STANCES)[number];
  tone: (typeof TONES)[number];
  target: (typeof TARGETS)[number];
  userClaimCandidates: RouterClaim[];
  references: string[];
  metaAttack: boolean;
  outOfScope: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  ambiguous: boolean;
};

export type RoutedCase = {
  id: string;
  locale: "pt-BR" | "en-US";
  text: string;
  envelope: SemanticRoutingEnvelope;
};

export type BlindCase = {
  id: string;
  groupId: string;
  locale: "pt-BR" | "en-US";
  text: string;
  canonicalPrimaryIntent: RouterIntent;
  acceptablePrimaryIntents: RouterIntent[];
  canonicalSecondaryIntents: RouterIntent[];
  coreSecondaryIntents: RouterIntent[];
  canonicalIntentFamily: IntentFamily;
  canonicalClaims: Array<{ claimType: ClaimType; sourceSpan: string }>;
  styleProfile: string;
  difficultyProfile: "EASY" | "MEDIUM" | "HARD";
  adversarial: boolean;
  intentionallyAmbiguous: boolean;
  outOfScope: boolean;
};
