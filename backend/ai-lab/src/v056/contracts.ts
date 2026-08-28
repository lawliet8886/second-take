import { z } from "zod";
import type { ConversationState } from "../v05/contracts.js";

export type SelectorLocale = "pt-BR" | "en-US";
export type SelectorConfidence = "HIGH" | "MEDIUM" | "LOW";

export type SelectorCase = {
  id: string;
  locale: SelectorLocale;
  category: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  userIntent: string;
  userTurn: string;
  state: ConversationState;
  recentContext: string[];
  candidatePlanIds: string[];
  acceptablePlanIds: string[];
  preferredPlanIds: string[];
  intentLock: null | { routerPrimaryIntent: "ASK_CAPABILITY" | "REQUEST_COMPLETION"; confirmedIntent: "ASK_CAPABILITY" | "REQUEST_COMPLETION" };
  paraphraseGroupId: string | null;
  forkPairId: string | null;
  forkKind: "MATERIAL" | "METAMORPHIC" | null;
};

export type SelectorDecision = {
  id: string;
  planId: string;
  confidence: SelectorConfidence;
};

export const selectorDecisionSchema = z.object({
  id: z.string(),
  planId: z.string(),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
}).strict();

export type SelectorRouteRecord = {
  case: SelectorCase;
  decision: SelectorDecision | null;
  selectedPlanId: string;
  acceptableHit: boolean;
  preferredHit: boolean | null;
  invalidPlan: boolean;
  unsafePlan: boolean;
  fallbackUsed: boolean;
  fallbackReason: "NONE" | "LOW_CONFIDENCE" | "STRUCTURAL_FAILURE" | "TRANSPORT_FAILURE";
  latencyMs: number | null;
  fullLatencyMs: number | null;
  logicalCalls: number;
  httpAttempts: number;
  transportRetries: number;
  attempts: unknown[];
  usage: { inputTokens: number; outputTokens: number; thinkingTokens: number; totalTokens: number };
  estimatedCostUsd: number;
};
