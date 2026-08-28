export type ValidatorName =
  | "SchemaValidator"
  | "FactValidator"
  | "PersonaValidator"
  | "LocaleValidator"
  | "SnapshotValidator"
  | "HistoryValidator"
  | "RevelationValidator"
  | "RelationValidator"
  | "DiscourseValidator"
  | "EvidenceValidator"
  | "InjectionValidator";

export type ValidationIssue = {
  validator: ValidatorName;
  code: string;
  message: string;
  repairHint: string;
};

export type ValidationSummary = {
  valid: boolean;
  checks: Record<ValidatorName, boolean>;
  issues: ValidationIssue[];
};

export const allValidatorNames: ValidatorName[] = [
  "SchemaValidator",
  "FactValidator",
  "PersonaValidator",
  "LocaleValidator",
  "SnapshotValidator",
  "HistoryValidator",
  "RevelationValidator",
  "RelationValidator",
  "DiscourseValidator",
  "EvidenceValidator",
  "InjectionValidator",
];

export function summarize(issues: ValidationIssue[], notApplicable: ValidatorName[] = []): ValidationSummary {
  const checks = Object.fromEntries(
    allValidatorNames.map((name) => [name, notApplicable.includes(name) || !issues.some((issue) => issue.validator === name)]),
  ) as Record<ValidatorName, boolean>;
  return { valid: issues.length === 0, checks, issues };
}
