import type { ConversationState, ResponsePlan } from "../v05/contracts.js";
import { candidatePlansFromRouting } from "../v052/policy.js";
import type { SemanticRoutingEnvelopeV0521 } from "../v0521/contracts.js";
import type { IntentLockState } from "./contracts.js";
import { IntentLockPolicy } from "./policy.js";

export type ProductInputPreparation =
  | { kind: "WAITING_FOR_INTENT_LOCK"; lock: IntentLockState; candidatePlans: [] }
  | { kind: "POLICY_SELECTION"; lock: IntentLockState; candidatePlans: ResponsePlan[] };

export function prepareProductInput(input: {
  turnId: string;
  userText: string;
  locale: "pt-BR" | "en-US";
  envelope: SemanticRoutingEnvelopeV0521;
  conversationState: ConversationState;
}): ProductInputPreparation {
  const lock = new IntentLockPolicy().route(input);
  if (lock.stage === "WAITING_FOR_INTENT_LOCK") return { kind: "WAITING_FOR_INTENT_LOCK", lock, candidatePlans: [] };
  return {
    kind: "POLICY_SELECTION",
    lock,
    candidatePlans: candidatePlansFromRouting(input.conversationState, input.locale, input.userText, input.envelope),
  };
}
