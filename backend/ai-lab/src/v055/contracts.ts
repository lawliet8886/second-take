import type { ConversationState, ResponsePlan } from "../v05/contracts.js";
import type { RouterIntent } from "../v052/contracts.js";
import type { SemanticRoutingEnvelopeV0521 } from "../v0521/contracts.js";

export const INTENT_LOCK_INTENTS = ["ASK_CAPABILITY", "REQUEST_COMPLETION"] as const;
export type IntentLockIntent = (typeof INTENT_LOCK_INTENTS)[number];

export const INTENT_LOCK_STAGES = [
  "ROUTED",
  "WAITING_FOR_INTENT_LOCK",
  "INTENT_CONFIRMED",
  "POLICY_SELECTION",
] as const;
export type IntentLockStage = (typeof INTENT_LOCK_STAGES)[number];

export type IntentLockOption = {
  id: "CAPABILITY" | "REQUEST";
  intent: IntentLockIntent;
  label: string;
  routerSuggested: boolean;
};

export type IntentLockState = {
  stage: IntentLockStage;
  originalUserTurnId: string;
  originalUserText: string;
  locale: "pt-BR" | "en-US";
  routerPrimaryIntent: RouterIntent;
  options: IntentLockOption[];
  confirmedIntent: IntentLockIntent | null;
};

export type InterpretationOverrideV055 = {
  originalUserTurnId: string;
  routerPrimaryIntent: IntentLockIntent;
  confirmedIntent: IntentLockIntent;
  source: "USER_INTENT_LOCK";
  branchId: string | null;
  originalUserTextPreserved: true;
  createsTimelineMessage: false;
  mutatesFactGraph: false;
  mutatesForkSnapshot: false;
};

export type IntentLockResolution = {
  state: IntentLockState;
  override: InterpretationOverrideV055;
  policyEnvelope: SemanticRoutingEnvelopeV0521;
  candidatePlans: ResponsePlan[];
  conversationState: ConversationState;
};
