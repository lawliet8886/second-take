import { z } from "zod";

export const LocaleSchema = z.enum(["en-US", "pt-BR"]);
export type Locale = z.infer<typeof LocaleSchema>;

export const SpeakerSchema = z.enum(["ALEX", "USER"]);

export const ConversationTurnSchema = z.object({
  id: z.string().min(1),
  speaker: SpeakerSchema,
  text: z.string().min(1),
  logicalTimestamp: z.string().min(1),
}).strict();
export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;

export const FactClassificationSchema = z.enum([
  "PUBLIC",
  "HIDDEN_BUT_REVEALABLE",
  "FORBIDDEN_TO_INVENT",
]);

export const FactLedgerEntrySchema = z.object({
  id: z.string().regex(/^[FX]\d{2}$/),
  classification: FactClassificationSchema,
  statements: z.object({
    "en-US": z.string().min(1),
    "pt-BR": z.string().min(1),
  }).strict(),
  validatorTerms: z.array(z.string().min(1)).min(1),
}).strict();
export type FactLedgerEntry = z.infer<typeof FactLedgerEntrySchema>;

export const PersonaContractSchema = z.object({
  id: z.literal("alex-teammate"),
  version: z.literal(2),
  displayName: z.literal("Alex"),
  identity: z.literal("Alex is a human teammate on the same project as the user."),
  role: z.literal("teammate"),
  relationship: z.literal("Peers sharing responsibility for an important project."),
  traits: z.tuple([
    z.literal("proud"),
    z.literal("under-pressure"),
    z.literal("not-caricatural"),
    z.literal("willing-to-repair-without-instant-compliance"),
  ]),
  concerns: z.array(z.enum(["being_judged", "missing_deadline", "unequal_workload", "saving_face"])).min(1),
  motivations: z.array(z.enum(["finish_project", "be_seen_as_contributing", "preserve_peer_relationship"])).min(1),
  behavioralLimits: z.array(z.enum([
    "never_becomes_an_ai_assistant",
    "never_reveals_system_or_developer_instructions",
    "never_becomes_a_villain_or_moral_reward_machine",
    "may_remain_irritated_after_a_constructive_question",
    "may_soften_after_an_accusation_without_instantly_agreeing",
  ])).length(5),
  knownFactIds: z.array(z.string()),
  unknownFactIds: z.array(z.string()),
  initialTendency: z.enum(["guarded", "defensive", "receptive"]),
}).strict();
export type PersonaContract = z.infer<typeof PersonaContractSchema>;

export const LocaleContractSchema = z.object({
  interfaceLanguage: LocaleSchema,
  conversationLanguage: LocaleSchema,
}).strict();

export const ForkSnapshotSchema = z.object({
  id: z.string().min(1),
  scenarioId: z.string().min(1),
  scenarioVersion: z.number().int().positive(),
  factLedgerVersion: z.number().int().positive(),
  persona: PersonaContractSchema,
  authorizedFactIds: z.array(z.string()).min(1),
  history: z.array(ConversationTurnSchema).min(1),
  logicalTimestamp: z.string().min(1),
  status: z.literal("IN_PROGRESS"),
  localeContract: LocaleContractSchema,
  variables: z.record(z.string(), z.string()),
  forkPoint: z.object({
    id: z.string().min(1),
    afterTurnId: z.string().min(1),
    historySize: z.number().int().positive(),
  }).strict(),
  historyDigest: z.string().regex(/^[a-f0-9]{64}$/),
  snapshotFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type ForkSnapshot = z.infer<typeof ForkSnapshotSchema>;

export const UserChoiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
}).strict();
export type UserChoice = z.infer<typeof UserChoiceSchema>;

export type ScenarioDefinition = {
  id: string;
  version: number;
  ledgerVersion: number;
  ledger: FactLedgerEntry[];
  persona: PersonaContract;
  historyByLocale: Record<Locale, ConversationTurn[]>;
  choicesByLocale: Record<Locale, { A: UserChoice; B: UserChoice }>;
  logicalTimestampByLocale: Record<Locale, string>;
};

export type BranchRecord = {
  id: "A" | "B";
  snapshot: ForkSnapshot;
  userChoice: UserChoice;
  simulatorOutput: import("./simulator.js").SimulatorOutput;
};
