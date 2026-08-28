import { z } from "zod";
import type { ForkSnapshot, ScenarioDefinition } from "./domain.js";

export const EmotionalStateSchema = z.enum(["defensive", "guarded", "frustrated", "conflicted", "receptive", "cooperative"]);
export const TrajectorySchema = z.enum(["escalated", "unchanged", "deescalated"]);
export const SnapshotViolationKindSchema = z.enum([
  "fact_invention",
  "identity_change",
  "persona_change",
  "relationship_change",
  "deadline_change",
  "locale_change",
  "history_rewrite",
  "snapshot_mutation",
  "hidden_fact_leak",
]);

export const SimulatorOutputSchema = z.object({
  alexReply: z.string().min(1).max(600),
  emotionalState: EmotionalStateSchema,
  conversationTrajectory: TrajectorySchema,
  revealedFacts: z.array(z.string()).max(7),
  claims: z.array(z.object({
    factId: z.string(),
    evidenceQuote: z.string().min(1),
    mode: z.enum(["stated", "implied"]),
  }).strict()).max(10),
  stillUnresolved: z.array(z.enum(["missing_slides", "delivery_plan", "communication_breakdown"])).max(3),
  newlyAllowedContext: z.array(z.string()).max(7),
  escalationDelta: z.number().int().min(-2).max(2),
  cooperationDelta: z.number().int().min(-2).max(2),
  personaSignals: z.object({
    tone: z.enum(["sharp", "guarded", "uneasy", "measured", "open"]),
    motivation: z.enum(["defend_effort", "understand_problem", "repair_project", "protect_relationship"]),
    relationshipStance: z.enum(["withdrawing", "holding_ground", "tentatively_engaging", "collaborating"]),
  }).strict(),
  snapshotEcho: z.object({
    snapshotId: z.string(),
    snapshotFingerprint: z.string(),
    historyDigest: z.string(),
    scenarioId: z.string(),
    personaId: z.string(),
    forkPointId: z.string(),
    locale: z.string(),
  }).strict(),
  snapshotViolations: z.array(SnapshotViolationKindSchema).max(9),
}).strict();
export type SimulatorOutput = z.infer<typeof SimulatorOutputSchema>;

export function simulatorJsonSchema(scenario: ScenarioDefinition, snapshot: ForkSnapshot): Record<string, unknown> {
  const allowedFactIds = snapshot.authorizedFactIds;
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      alexReply: { type: "string", description: "Alex's next spoken reply, directly in the requested locale; keep it concise." },
      emotionalState: { type: "string", enum: EmotionalStateSchema.options },
      conversationTrajectory: { type: "string", enum: TrajectorySchema.options },
      revealedFacts: { type: "array", maxItems: allowedFactIds.length, items: { type: "string", enum: allowedFactIds } },
      claims: {
        type: "array",
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            factId: { type: "string", enum: allowedFactIds },
            evidenceQuote: { type: "string", description: "Exact substring from alexReply supporting this claim." },
            mode: { type: "string", enum: ["stated", "implied"] },
          },
          required: ["factId", "evidenceQuote", "mode"],
        },
      },
      stillUnresolved: { type: "array", maxItems: 3, items: { type: "string", enum: ["missing_slides", "delivery_plan", "communication_breakdown"] } },
      newlyAllowedContext: { type: "array", maxItems: allowedFactIds.length, items: { type: "string", enum: allowedFactIds } },
      escalationDelta: { type: "integer", minimum: -2, maximum: 2 },
      cooperationDelta: { type: "integer", minimum: -2, maximum: 2 },
      personaSignals: {
        type: "object",
        additionalProperties: false,
        properties: {
          tone: { type: "string", enum: ["sharp", "guarded", "uneasy", "measured", "open"] },
          motivation: { type: "string", enum: ["defend_effort", "understand_problem", "repair_project", "protect_relationship"] },
          relationshipStance: { type: "string", enum: ["withdrawing", "holding_ground", "tentatively_engaging", "collaborating"] },
        },
        required: ["tone", "motivation", "relationshipStance"],
      },
      snapshotEcho: {
        type: "object",
        additionalProperties: false,
        properties: {
          snapshotId: { type: "string", enum: [snapshot.id] },
          snapshotFingerprint: { type: "string", enum: [snapshot.snapshotFingerprint] },
          historyDigest: { type: "string", enum: [snapshot.historyDigest] },
          scenarioId: { type: "string", enum: [snapshot.scenarioId] },
          personaId: { type: "string", enum: [snapshot.persona.id] },
          forkPointId: { type: "string", enum: [snapshot.forkPoint.id] },
          locale: { type: "string", enum: [snapshot.localeContract.conversationLanguage] },
        },
        required: ["snapshotId", "snapshotFingerprint", "historyDigest", "scenarioId", "personaId", "forkPointId", "locale"],
      },
      snapshotViolations: { type: "array", maxItems: 9, items: { type: "string", enum: SnapshotViolationKindSchema.options } },
    },
    required: ["alexReply", "emotionalState", "conversationTrajectory", "revealedFacts", "claims", "stillUnresolved", "newlyAllowedContext", "escalationDelta", "cooperationDelta", "personaSignals", "snapshotEcho", "snapshotViolations"],
  };
}
