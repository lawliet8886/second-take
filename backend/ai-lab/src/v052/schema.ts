import {
  CLAIM_TYPES,
  INTENT_FAMILIES,
  PRIMARY_INTENTS,
  SPEECH_ACTS,
  STANCES,
  TARGETS,
  TONES,
} from "./contracts.js";

export const envelopeJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "primaryIntent",
    "secondaryIntents",
    "intentFamily",
    "speechAct",
    "stance",
    "tone",
    "target",
    "userClaimCandidates",
    "references",
    "metaAttack",
    "outOfScope",
    "confidence",
    "ambiguous",
  ],
  properties: {
    primaryIntent: { type: "string", enum: PRIMARY_INTENTS },
    secondaryIntents: {
      type: "array",
      items: { type: "string" },
    },
    intentFamily: { type: "string", enum: INTENT_FAMILIES },
    speechAct: { type: "string", enum: SPEECH_ACTS },
    stance: { type: "string" },
    tone: { type: "string" },
    target: { type: "string" },
    userClaimCandidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["claimType", "sourceSpan"],
        properties: {
          claimType: { type: "string" },
          sourceSpan: { type: "string" },
        },
      },
    },
    references: { type: "array", items: { type: "string" } },
    metaAttack: { type: "boolean" },
    outOfScope: { type: "boolean" },
    confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
    ambiguous: { type: "boolean" },
  },
} as const;

export function routerBatchSchema(ids: string[]) {
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
            id: { type: "string" },
            envelope: envelopeJsonSchema,
          },
        },
      },
    },
  };
}
