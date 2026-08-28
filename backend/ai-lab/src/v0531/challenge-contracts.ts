import type { RouterIntent } from "../v052/contracts.js";
import type { ProbeAmbiguityClass, ProbeSense } from "./contracts.js";

export type V0531Cohort = "REQUEST_CAPABILITY" | "FRUSTRATION_ACCUSATION" | "OFFER_COLLABORATION" | "MULTI_ACT_SCOPE" | "CLEAR_FAMILY_CONTROL" | "OTHER_CLEAR_CONTROL";
export type V0531ChallengeJob = {
  batchId: string; cohort: V0531Cohort; locale: "pt-BR" | "en-US"; style: string;
  canonicalPrimaryIntent: RouterIntent; primarySense: ProbeSense; competingSense: ProbeSense;
  ambiguityClass: ProbeAmbiguityClass; ambiguityExpected: boolean; materialDifferenceExpected: boolean;
  acceptablePrimaryIntents: RouterIntent[];
};
export type V0531ChallengeCase = V0531ChallengeJob & { id: string; groupId: string; text: string; labelDrift: boolean };
