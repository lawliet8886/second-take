import {
  AMBIGUITY_TYPES,
  CLAIM_TYPES,
  INTENT_FAMILIES,
  PRIMARY_INTENTS,
  SPEECH_ACTS,
  STANCES,
  TARGETS,
  TONES,
} from "./contracts.js";

export const envelopeJsonSchemaV0521 = {
  type: "object",
  additionalProperties: false,
  required: [
    "primaryIntent",
    "alternativeIntent",
    "ambiguityType",
    "secondaryIntents",
    "speechAct",
    "userClaimCandidates",
    "confidence",
    "ambiguous",
  ],
  properties: {
    primaryIntent: { type: "string", enum: PRIMARY_INTENTS },
    // Interactions structured output accepts nullable fields through a type
    // array. Runtime parsing still enforces the finite PRIMARY_INTENTS enum.
    alternativeIntent: { type: ["string", "null"] },
    ambiguityType: { type: "string", enum: AMBIGUITY_TYPES },
    secondaryIntents: {
      type: "array",
      maxItems: 2,
      items: { type: "string" },
    },
    speechAct: { type: "string", enum: SPEECH_ACTS },
    userClaimCandidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["claimType", "sourceSpan"],
        properties: {
          claimType: { type: "string" },
          sourceSpan: { type: "string", minLength: 1 },
        },
      },
    },
    confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
    ambiguous: { type: "boolean" },
  },
} as const;

export function routerBatchSchemaV0521(ids: string[]) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["routes"],
    properties: {
      routes: {
        type: "array",
        minItems: ids.length,
        maxItems: ids.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "envelope"],
          properties: {
            id: { type: "string", enum: ids },
            envelope: envelopeJsonSchemaV0521,
          },
        },
      },
    },
  } as const;
}
