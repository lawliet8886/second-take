import type { CoachOutput } from "./coach.js";
import type { Locale } from "./domain.js";
import type { SimulatorOutput } from "./simulator.js";
import type { ValidationSummary } from "../validators/types.js";

export type ThinkingLevel = "low" | "medium" | "high";
export type LabRole = "simulator" | "coach";

export type ModelProfile = {
  id: string;
  role: LabRole;
  thinkingLevel: ThinkingLevel;
  maxOutputTokens: number;
  seed?: number;
  samplingNote: string;
};

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  totalTokens: number;
};

export type AttemptRecord = {
  attempt: number;
  kind: "original" | "repair";
  latencyMs: number;
  usage: TokenUsage;
  estimatedCostUsd: number;
  rawOutput: unknown;
  validation: ValidationSummary;
};

export type ExperimentResult = {
  experimentId: string;
  category: string;
  role: LabRole;
  model: string;
  profile: ModelProfile;
  locale: Locale;
  branch?: "A" | "B";
  userChoice?: string;
  startedAt: string;
  attempts: AttemptRecord[];
  retries: number;
  accepted: boolean;
  finalOutput?: SimulatorOutput | CoachOutput;
  notes: string[];
};

export type LabRun = {
  schemaVersion: 1;
  runId: string;
  startedAt: string;
  completedAt: string;
  model: string;
  maxRepairRetries: number;
  plannedExperiments: number;
  experiments: ExperimentResult[];
  stoppedReason?: string;
};
