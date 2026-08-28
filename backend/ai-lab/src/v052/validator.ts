import { FAMILY_BY_INTENT, type GroundingStatus, type SemanticRoutingEnvelope } from "./contracts.js";

export type EnvelopeValidation = { valid: boolean; violations: string[] };

export function validateEnvelope(
  userText: string,
  envelope: SemanticRoutingEnvelope,
): EnvelopeValidation {
  const violations: string[] = [];
  if (FAMILY_BY_INTENT[envelope.primaryIntent] !== envelope.intentFamily)
    violations.push("INTENT_FAMILY_MISMATCH");
  if (envelope.secondaryIntents.includes(envelope.primaryIntent))
    violations.push("PRIMARY_REPEATED_AS_SECONDARY");
  if (new Set(envelope.secondaryIntents).size !== envelope.secondaryIntents.length)
    violations.push("DUPLICATE_SECONDARY_INTENT");
  if (envelope.secondaryIntents.length > 3)
    violations.push("SECONDARY_INTENT_LIMIT");
  for (const claim of envelope.userClaimCandidates) {
    if (!claim.sourceSpan || !userText.includes(claim.sourceSpan))
      violations.push(`CLAIM_SOURCE_SPAN_NOT_FOUND:${claim.claimType}`);
  }
  for (const ref of envelope.references)
    if (ref && !userText.includes(ref)) violations.push("REFERENCE_SPAN_NOT_FOUND");
  if (envelope.metaAttack !== (envelope.primaryIntent === "META_PROMPT_ATTACK" || envelope.secondaryIntents.includes("META_PROMPT_ATTACK")))
    violations.push("META_FLAG_INTENT_MISMATCH");
  if (envelope.outOfScope !== (envelope.primaryIntent === "OUT_OF_SCOPE"))
    violations.push("OUT_OF_SCOPE_FLAG_INTENT_MISMATCH");
  if (envelope.ambiguous && envelope.primaryIntent !== "AMBIGUOUS")
    violations.push("AMBIGUOUS_FLAG_INTENT_MISMATCH");
  return { valid: violations.length === 0, violations };
}

export function classifyClaim(claimType: string): GroundingStatus {
  if (["SCHEDULE_CHANGED", "SLIDES_UNFINISHED", "DEADLINE_FRIDAY"].includes(claimType))
    return "GROUNDED";
  if (["DEADLINE_CHANGED", "PRIOR_PROMISE"].includes(claimType))
    return "CONTRADICTED";
  return "UNKNOWN";
}
