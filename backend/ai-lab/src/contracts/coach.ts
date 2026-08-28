import { z } from "zod";
import type { BranchRecord } from "./domain.js";

const EvidenceSourceSchema = z.enum(["choiceA", "alexReplyA", "choiceB", "alexReplyB", "history"]);

export const EvidenceQuoteSchema = z.object({
  source: EvidenceSourceSchema,
  quote: z.string().min(1),
  supports: z.string().min(1).max(300),
}).strict();

export const CoachOutputSchema = z.object({
  turningPoint: z.object({
    turnId: z.string().min(1),
    branchAUserQuote: z.string().min(1),
    branchBUserQuote: z.string().min(1),
  }).strict(),
  branchAObservation: z.string().min(1).max(700),
  branchBObservation: z.string().min(1).max(700),
  causalDifference: z.object({
    observation: z.string().min(1).max(700),
    inference: z.string().min(1).max(700),
    possibility: z.string().min(1).max(700),
  }).strict(),
  causalAssessment: z.object({
    attribution: z.enum(["convincing", "plausible_but_uncertain", "weak_or_random"]),
    reasoning: z.string().min(1).max(700),
    alternativeExplanation: z.string().min(1).max(500),
  }).strict(),
  evidenceQuotes: z.array(EvidenceQuoteSchema).min(4).max(8),
  whatChanged: z.array(z.enum(["user_wording", "alex_immediate_reply", "trajectory", "revealed_context", "cooperation", "escalation"])).min(1),
  whatStayedSame: z.array(z.enum(["facts", "persona", "history", "relationship", "deadline", "locale", "fork_point"])).min(5),
  nextPracticeSuggestion: z.string().min(1).max(500),
  confidence: z.number().min(0).max(1),
}).strict();
export type CoachOutput = z.infer<typeof CoachOutputSchema>;

export function coachJsonSchema(branchA: BranchRecord, branchB: BranchRecord): Record<string, unknown> {
  const sourceQuotes: Record<string, string[]> = {
    choiceA: [branchA.userChoice.text],
    alexReplyA: [branchA.simulatorOutput.alexReply],
    choiceB: [branchB.userChoice.text],
    alexReplyB: [branchB.simulatorOutput.alexReply],
    history: branchA.snapshot.history.map((turn) => turn.text),
  };
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      turningPoint: {
        type: "object",
        additionalProperties: false,
        properties: {
          turnId: { type: "string", enum: [branchA.snapshot.forkPoint.id] },
          branchAUserQuote: { type: "string", enum: sourceQuotes.choiceA },
          branchBUserQuote: { type: "string", enum: sourceQuotes.choiceB },
        },
        required: ["turnId", "branchAUserQuote", "branchBUserQuote"],
      },
      branchAObservation: { type: "string", description: "Concise observation grounded in supplied wording." },
      branchBObservation: { type: "string", description: "Concise observation grounded in supplied wording." },
      causalDifference: {
        type: "object",
        additionalProperties: false,
        properties: {
          observation: { type: "string" },
          inference: { type: "string" },
          possibility: { type: "string" },
        },
        required: ["observation", "inference", "possibility"],
      },
      causalAssessment: {
        type: "object",
        additionalProperties: false,
        properties: {
          attribution: { type: "string", enum: ["convincing", "plausible_but_uncertain", "weak_or_random"] },
          reasoning: { type: "string" },
          alternativeExplanation: { type: "string" },
        },
        required: ["attribution", "reasoning", "alternativeExplanation"],
      },
      evidenceQuotes: {
        type: "array",
        minItems: 4,
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            source: { type: "string", enum: EvidenceSourceSchema.options },
            quote: { type: "string", description: "An exact substring from the named source, never a paraphrase." },
            supports: { type: "string" },
          },
          required: ["source", "quote", "supports"],
        },
      },
      whatChanged: { type: "array", minItems: 1, items: { type: "string", enum: ["user_wording", "alex_immediate_reply", "trajectory", "revealed_context", "cooperation", "escalation"] } },
      whatStayedSame: { type: "array", minItems: 5, items: { type: "string", enum: ["facts", "persona", "history", "relationship", "deadline", "locale", "fork_point"] } },
      nextPracticeSuggestion: { type: "string" },
      confidence: { type: "number", minimum: 0, maximum: 1 },
    },
    required: ["turningPoint", "branchAObservation", "branchBObservation", "causalDifference", "causalAssessment", "evidenceQuotes", "whatChanged", "whatStayedSame", "nextPracticeSuggestion", "confidence"],
  };
}
