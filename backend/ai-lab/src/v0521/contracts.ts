import {
  CLAIM_TYPES,
  FAMILY_BY_INTENT,
  INTENT_FAMILIES,
  PRIMARY_INTENTS,
  SPEECH_ACTS,
  STANCES,
  TARGETS,
  TONES,
  type ClaimType,
  type IntentFamily,
  type RouterIntent,
} from "../v052/contracts.js";

export {
  CLAIM_TYPES,
  FAMILY_BY_INTENT,
  INTENT_FAMILIES,
  PRIMARY_INTENTS,
  SPEECH_ACTS,
  STANCES,
  TARGETS,
  TONES,
};
export type { ClaimType, IntentFamily, RouterIntent };

export const AMBIGUITY_TYPES = [
  "NONE",
  "REQUEST_VS_CAPABILITY",
  "QUESTION_VS_REQUEST",
  "FRUSTRATION_VS_ACCUSATION",
  "OFFER_VS_COLLABORATION",
  "UNCLEAR_REFERENCE",
  "MULTI_ACT_SCOPE",
  "OTHER_MATERIAL",
] as const;
export type AmbiguityType = (typeof AMBIGUITY_TYPES)[number];

export type RouterClaimV0521 = {
  claimType: ClaimType;
  sourceSpan: string;
};

export type SemanticRoutingEnvelopeV0521 = {
  primaryIntent: RouterIntent;
  alternativeIntent: RouterIntent | null;
  ambiguityType: AmbiguityType;
  secondaryIntents: RouterIntent[];
  intentFamily: IntentFamily;
  speechAct: (typeof SPEECH_ACTS)[number];
  stance: (typeof STANCES)[number];
  tone: (typeof TONES)[number];
  target: (typeof TARGETS)[number];
  userClaimCandidates: RouterClaimV0521[];
  references: string[];
  metaAttack: boolean;
  outOfScope: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  ambiguous: boolean;
};

export type RouterInputV0521 = {
  id: string;
  locale: "pt-BR" | "en-US";
  text: string;
};

export type RoutedCaseV0521 = RouterInputV0521 & {
  envelope: SemanticRoutingEnvelopeV0521;
};

// Stable public aliases keep v0.5.2.1 tooling concise while the suffixed names
// make cross-version imports explicit where both contracts are in scope.
export type SemanticRoutingEnvelope = SemanticRoutingEnvelopeV0521;
export type RouterInput = RouterInputV0521;
export type RoutedCase = RoutedCaseV0521;
