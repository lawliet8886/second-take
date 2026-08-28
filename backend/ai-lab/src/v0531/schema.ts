import { PROBE_AMBIGUITY_CLASSES } from "./contracts.js";

export function probeBatchSchema(ids: string[]) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["results"],
    properties: {
      results: {
        type: "array",
        minItems: ids.length,
        maxItems: ids.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "alternativeIsMateriallyPlausible", "ambiguityClass", "confidence"],
          properties: {
            id: { type: "string", enum: ids },
            alternativeIsMateriallyPlausible: { type: "boolean" },
            ambiguityClass: { type: "string", enum: PROBE_AMBIGUITY_CLASSES },
            confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          },
        },
      },
    },
  } as const;
}

