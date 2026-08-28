import {
  AMBIGUITY_TYPES,
  FAMILY_BY_INTENT,
  type SemanticRoutingEnvelopeV0521,
} from "./contracts.js";

export type EnvelopeValidationV0521 = { valid: boolean; violations: string[] };

export function validateEnvelopeV0521(
  userText: string,
  envelope: SemanticRoutingEnvelopeV0521,
): EnvelopeValidationV0521 {
  const violations: string[] = [];
  if (FAMILY_BY_INTENT[envelope.primaryIntent] !== envelope.intentFamily)
    violations.push("INTENT_FAMILY_MISMATCH");
  if (envelope.secondaryIntents.includes(envelope.primaryIntent))
    violations.push("PRIMARY_REPEATED_AS_SECONDARY");
  if (envelope.alternativeIntent && envelope.secondaryIntents.includes(envelope.alternativeIntent))
    violations.push("ALTERNATIVE_REPEATED_AS_SECONDARY");
  if (new Set(envelope.secondaryIntents).size !== envelope.secondaryIntents.length)
    violations.push("DUPLICATE_SECONDARY_INTENT");
  if (envelope.secondaryIntents.length > 2)
    violations.push("SECONDARY_INTENT_LIMIT");

  if (envelope.ambiguous) {
    if (!envelope.alternativeIntent) violations.push("AMBIGUOUS_WITHOUT_ALTERNATIVE");
    if (envelope.alternativeIntent === envelope.primaryIntent) violations.push("ALTERNATIVE_EQUALS_PRIMARY");
    if (envelope.ambiguityType === "NONE") violations.push("AMBIGUOUS_WITHOUT_TYPE");
    if (envelope.confidence !== "LOW") violations.push("AMBIGUOUS_CONFIDENCE_NOT_LOW");
  } else {
    if (envelope.alternativeIntent !== null) violations.push("NON_AMBIGUOUS_WITH_ALTERNATIVE");
    if (envelope.ambiguityType !== "NONE") violations.push("NON_AMBIGUOUS_WITH_TYPE");
    if (envelope.confidence === "LOW") violations.push("LOW_CONFIDENCE_WITHOUT_AMBIGUITY");
  }
  if (!(AMBIGUITY_TYPES as readonly string[]).includes(envelope.ambiguityType))
    violations.push("INVALID_AMBIGUITY_TYPE");

  for (const claim of envelope.userClaimCandidates) {
    if (!claim.sourceSpan || !userText.includes(claim.sourceSpan))
      violations.push(`CLAIM_SOURCE_SPAN_NOT_FOUND:${claim.claimType}`);
  }
  for (const ref of envelope.references) {
    if (!ref || !userText.includes(ref)) violations.push("REFERENCE_SPAN_NOT_FOUND");
  }
  if (envelope.metaAttack !== (envelope.primaryIntent === "META_PROMPT_ATTACK" || envelope.secondaryIntents.includes("META_PROMPT_ATTACK")))
    violations.push("META_FLAG_INTENT_MISMATCH");
  if (envelope.outOfScope !== (envelope.primaryIntent === "OUT_OF_SCOPE"))
    violations.push("OUT_OF_SCOPE_FLAG_INTENT_MISMATCH");
  return { valid: violations.length === 0, violations };
}
