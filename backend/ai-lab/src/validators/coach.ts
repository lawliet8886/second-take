import type { BranchRecord } from "../contracts/domain.js";
import { CoachOutputSchema, type CoachOutput } from "../contracts/coach.js";
import type { ValidationIssue, ValidationSummary } from "./types.js";
import { summarize } from "./types.js";

const forbiddenJudgmentPatterns = [
  /\b(score|rating|nota)\s*[:=]?\s*\d{1,3}\b/i,
  /\b(always right|always wrong|certo absoluto|errado absoluto)\b/i,
  /\b(narcissist|narcisista|personality disorder|transtorno)\b/i,
];

function issue(validator: ValidationIssue["validator"], code: string, message: string, repairHint: string): ValidationIssue {
  return { validator, code, message, repairHint };
}

function sourceText(source: CoachOutput["evidenceQuotes"][number]["source"], branchA: BranchRecord, branchB: BranchRecord): string[] {
  if (source === "choiceA") return [branchA.userChoice.text];
  if (source === "alexReplyA") return [branchA.simulatorOutput.alexReply];
  if (source === "choiceB") return [branchB.userChoice.text];
  if (source === "alexReplyB") return [branchB.simulatorOutput.alexReply];
  return branchA.snapshot.history.map((turn) => turn.text);
}

export function validateCoachOutput(raw: unknown, branchA: BranchRecord, branchB: BranchRecord): { parsed?: CoachOutput; validation: ValidationSummary } {
  const parsed = CoachOutputSchema.safeParse(raw);
  if (!parsed.success) {
    return { validation: summarize([issue("SchemaValidator", "SCHEMA_INVALID", parsed.error.issues.map((entry) => `${entry.path.join(".")}: ${entry.message}`).join("; "), "Return exactly the requested Coach JSON structure.")]) };
  }

  const output = parsed.data;
  const issues: ValidationIssue[] = [];
  if (output.turningPoint.turnId !== branchA.snapshot.forkPoint.id) issues.push(issue("SnapshotValidator", "FORK_POINT_CHANGED", "Coach changed the turning point.", "Use the exact supplied fork point ID."));
  if (output.turningPoint.branchAUserQuote !== branchA.userChoice.text || output.turningPoint.branchBUserQuote !== branchB.userChoice.text) issues.push(issue("EvidenceValidator", "CHOICE_QUOTE_CHANGED", "Coach did not preserve both exact user choices.", "Copy both choices verbatim."));

  for (const evidence of output.evidenceQuotes) {
    if (!sourceText(evidence.source, branchA, branchB).some((text) => text.includes(evidence.quote))) {
      issues.push(issue("EvidenceValidator", "QUOTE_NOT_FOUND", `Evidence quote was not found in ${evidence.source}.`, "Use an exact substring from the named source."));
    }
  }

  const prose = JSON.stringify(output);
  for (const pattern of forbiddenJudgmentPatterns) {
    if (pattern.test(prose)) issues.push(issue("PersonaValidator", "COACH_OVERREACH", "Coach used a score, diagnosis, or absolute moral judgment.", "Describe observable wording and calibrated causal inference only."));
  }
  if (!output.whatStayedSame.includes("facts") || !output.whatStayedSame.includes("persona") || !output.whatStayedSame.includes("history")) {
    issues.push(issue("SnapshotValidator", "INVARIANTS_OMITTED", "Coach failed to acknowledge core frozen invariants.", "Include facts, persona, and history in whatStayedSame."));
  }
  if (output.evidenceQuotes.length < 4) issues.push(issue("EvidenceValidator", "INSUFFICIENT_EVIDENCE", "Coach supplied too little direct evidence.", "Cite both user choices and both immediate Alex replies."));

  return {
    parsed: output,
    validation: summarize(issues, ["FactValidator", "LocaleValidator", "HistoryValidator", "RevelationValidator", "InjectionValidator"]),
  };
}
