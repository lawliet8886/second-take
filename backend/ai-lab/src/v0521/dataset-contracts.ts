import type { ClaimType, IntentFamily, RouterIntent } from "./contracts.js";

export const V0521_COHORTS = [
  "CLEAR_SINGLE_INTENT",
  "GENUINE_AMBIGUOUS",
  "MULTI_INTENT",
  "CLAIM_PRESENT",
  "NO_CLAIM_LOOKALIKE",
  "META_ATTACK",
  "OUT_OF_SCOPE",
] as const;

export type V0521Cohort = (typeof V0521_COHORTS)[number];

export const V0521_AMBIGUITY_TYPES = [
  "NONE",
  "REQUEST_VS_CAPABILITY",
  "QUESTION_VS_REQUEST",
  "FRUSTRATION_VS_ACCUSATION",
  "OFFER_VS_COLLABORATION",
  "UNCLEAR_REFERENCE",
  "MULTI_ACT_SCOPE",
  "OTHER_MATERIAL",
] as const;

export type V0521AmbiguityType = (typeof V0521_AMBIGUITY_TYPES)[number];

export type V0521CanonicalClaim = {
  claimType: ClaimType;
  sourceSpan: string;
  epistemicStrength: "ASSERTED" | "HEDGED";
};

export type V0521DatasetCase = {
  id: string;
  groupId: string;
  locale: "pt-BR" | "en-US";
  text: string;
  cohort: V0521Cohort;
  canonicalPrimaryIntent: RouterIntent;
  acceptablePrimaryIntents: RouterIntent[];
  canonicalIntentFamily: IntentFamily;
  requiredSecondaryIntents: RouterIntent[];
  optionalSecondaryIntents: RouterIntent[];
  forbiddenSecondaryIntents: RouterIntent[];
  canonicalClaims: V0521CanonicalClaim[];
  claimExpected: boolean;
  ambiguousExpected: boolean;
  alternativeIntent: RouterIntent | null;
  ambiguityType: V0521AmbiguityType;
  metaAttackExpected: boolean;
  outOfScopeExpected: boolean;
  styleProfile: string;
  difficultyProfile: "EASY" | "MEDIUM" | "HARD";
};

export type V0521Dataset = {
  schemaVersion: "v0521-dataset-1";
  createdAt: string;
  cases: V0521DatasetCase[];
};
