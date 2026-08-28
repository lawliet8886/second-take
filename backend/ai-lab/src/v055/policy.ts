import { FAMILY_BY_INTENT, type RouterIntent } from "../v052/contracts.js";
import { candidatePlansFromRouting } from "../v052/policy.js";
import type { SemanticRoutingEnvelopeV0521 } from "../v0521/contracts.js";
import type { ConversationState } from "../v05/contracts.js";
import type {
  IntentLockIntent,
  IntentLockResolution,
  IntentLockState,
  InterpretationOverrideV055,
} from "./contracts.js";
import { INTENT_LOCK_INTENTS } from "./contracts.js";
import { IntentLockOptionBuilder } from "./options.js";

const LOCKABLE = new Set<RouterIntent>(INTENT_LOCK_INTENTS);

export function isIntentLockIntent(intent: RouterIntent): intent is IntentLockIntent {
  return LOCKABLE.has(intent);
}

export class IntentLockPolicy {
  constructor(private readonly options = new IntentLockOptionBuilder()) {}

  route(input: {
    turnId: string;
    userText: string;
    locale: "pt-BR" | "en-US";
    envelope: SemanticRoutingEnvelopeV0521;
  }): IntentLockState {
    const common = {
      originalUserTurnId: input.turnId,
      originalUserText: input.userText,
      locale: input.locale,
      routerPrimaryIntent: input.envelope.primaryIntent,
      confirmedIntent: null,
    } as const;

    if (!isIntentLockIntent(input.envelope.primaryIntent)) {
      return { ...common, stage: "POLICY_SELECTION", options: [] };
    }

    return {
      ...common,
      stage: "WAITING_FOR_INTENT_LOCK",
      options: this.options.build({
        locale: input.locale,
        userText: input.userText,
        routerPrimaryIntent: input.envelope.primaryIntent,
      }),
    };
  }

  confirm(input: {
    lock: IntentLockState;
    confirmedIntent: IntentLockIntent;
    branchId?: string | null;
  }): { state: IntentLockState; override: InterpretationOverrideV055 } {
    if (input.lock.stage !== "WAITING_FOR_INTENT_LOCK") throw new Error("INTENT_LOCK_NOT_WAITING");
    if (!input.lock.options.some((option) => option.intent === input.confirmedIntent)) throw new Error("INTENT_LOCK_UNKNOWN_OPTION");
    if (!isIntentLockIntent(input.lock.routerPrimaryIntent)) throw new Error("INTENT_LOCK_INVALID_ROUTER_INTENT");

    const override: InterpretationOverrideV055 = {
      originalUserTurnId: input.lock.originalUserTurnId,
      routerPrimaryIntent: input.lock.routerPrimaryIntent,
      confirmedIntent: input.confirmedIntent,
      source: "USER_INTENT_LOCK",
      branchId: input.branchId ?? null,
      originalUserTextPreserved: true,
      createsTimelineMessage: false,
      mutatesFactGraph: false,
      mutatesForkSnapshot: false,
    };

    return {
      state: { ...input.lock, stage: "INTENT_CONFIRMED", confirmedIntent: input.confirmedIntent },
      override,
    };
  }
}

export function envelopeWithIntentLock(
  envelope: SemanticRoutingEnvelopeV0521,
  override: InterpretationOverrideV055,
): SemanticRoutingEnvelopeV0521 {
  return {
    ...envelope,
    primaryIntent: override.confirmedIntent,
    intentFamily: FAMILY_BY_INTENT[override.confirmedIntent],
    alternativeIntent: null,
    ambiguityType: "NONE",
    ambiguous: false,
  };
}

export function resolveIntentLockToPolicy(input: {
  lock: IntentLockState;
  envelope: SemanticRoutingEnvelopeV0521;
  confirmedIntent: IntentLockIntent;
  conversationState: ConversationState;
  branchId?: string | null;
}): IntentLockResolution {
  const policy = new IntentLockPolicy();
  const confirmed = policy.confirm({
    lock: input.lock,
    confirmedIntent: input.confirmedIntent,
    ...(input.branchId === undefined ? {} : { branchId: input.branchId }),
  });
  const policyEnvelope = envelopeWithIntentLock(input.envelope, confirmed.override);
  const candidatePlans = candidatePlansFromRouting(
    input.conversationState,
    input.lock.locale,
    input.lock.originalUserText,
    policyEnvelope,
  );
  return {
    state: { ...confirmed.state, stage: "POLICY_SELECTION" },
    override: confirmed.override,
    policyEnvelope,
    candidatePlans,
    conversationState: input.conversationState,
  };
}
