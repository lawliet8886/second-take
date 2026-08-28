import { z } from "zod";
import type { SelectorCase, SelectorConfidence } from "../v056/contracts.js";

export type RuntimeFailureClass =
  | "MAX_TOKEN_TRUNCATION"
  | "EMPTY_HTTP_200"
  | "MALFORMED_JSON"
  | "SCHEMA_INVALID"
  | "INVALID_ENUM_RESULT"
  | "TRANSPORT_FAILURE"
  | "UNKNOWN_STRUCTURAL_FAILURE";

export type RuntimeAttempt = {
  structuralAttempt: number;
  transportAttempt: number;
  timestamp: string;
  httpStatus: number | null;
  latencyMs: number;
  outcome: "SEMANTIC_RESULT" | "STRUCTURAL_FAILURE" | "TRANSPORT_FAILURE";
  failureClass: RuntimeFailureClass | null;
  finishReason: string | null;
  rawBodyLength: number;
  outputEndedMidJson: boolean;
  partialCandidateId: string | null;
  parseValid: boolean;
  schemaValid: boolean;
  errorMessage: string | null;
  usage: { inputTokens: number; outputTokens: number; thinkingTokens: number; totalTokens: number };
};

export type RuntimeDecision = { id: string; planId: string; confidence: SelectorConfidence };
export const runtimeDecisionSchema = z.object({ id: z.string(), planId: z.string(), confidence: z.enum(["HIGH", "MEDIUM", "LOW"]) }).strict();

export type RuntimeSelectionRecord = {
  case: SelectorCase;
  decision: RuntimeDecision | null;
  selectedPlanId: string;
  acceptableHit: boolean;
  preferredHit: boolean | null;
  unsafePlan: boolean;
  invalidPlan: boolean;
  fallbackReason: "NONE" | "LOW_CONFIDENCE" | "STRUCTURAL_FAILURE" | "TRANSPORT_FAILURE" | "INVALID_ENUM_RESULT";
  firstAttemptStructuredValid: boolean;
  finalStructuredValid: boolean;
  structuralRetries: number;
  transportRetries: number;
  attempts: RuntimeAttempt[];
  firstAttemptLatencyMs: number | null;
  fullLatencyMs: number;
  usage: { inputTokens: number; outputTokens: number; thinkingTokens: number; totalTokens: number };
  estimatedCostUsd: number;
};

