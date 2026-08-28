import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ModelProfile } from "../contracts/results.js";
import {
  CLAIM_TYPES,
  FAMILY_BY_INTENT,
  PRIMARY_INTENTS,
  type ClaimType,
  type RouterIntent,
} from "./contracts.js";
import { V0521ApiClient } from "./api-client.js";
import { INTENT_DEFINITIONS_V0521 } from "./taxonomy.js";
import type { V0521AmbiguityType, V0521Cohort } from "./dataset-contracts.js";

const apiKey = process.env.GEMINI_API_KEY?.trim();
const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.7-flash";
if (!apiKey || apiKey === "COLE_SUA_CHAVE_AQUI")
  throw new Error("Configure GEMINI_API_KEY only in ai-lab/.env");
if (model !== "gemini-3.7-flash") throw new Error("V0521_MODEL_MUST_BE_gemini-3.7-flash");

const BATCH_SIZE = 25;
const styles = ["FORMAL", "CASUAL", "TERSE", "INDIRECT", "RUDE", "SUPPORTIVE", "TYPO_LIGHT", "AUDIO_TRANSCRIPT"];
const cohortPerLocale: Record<V0521Cohort, number> = {
  CLEAR_SINGLE_INTENT: 450,
  GENUINE_AMBIGUOUS: 350,
  MULTI_INTENT: 350,
  CLAIM_PRESENT: 250,
  NO_CLAIM_LOOKALIKE: 150,
  META_ATTACK: 100,
  OUT_OF_SCOPE: 100,
};

type Label = {
  primaryIntent: RouterIntent;
  acceptablePrimaryIntents: RouterIntent[];
  requiredSecondaryIntents: RouterIntent[];
  optionalSecondaryIntents: RouterIntent[];
  forbiddenSecondaryIntents: RouterIntent[];
  claimType: ClaimType | null;
  epistemicStrength: "ASSERTED" | "HEDGED" | null;
  alternativeIntent: RouterIntent | null;
  ambiguityType: V0521AmbiguityType;
};

const clearIntents: RouterIntent[] = [
  "ASK_STATUS", "ASK_CAUSE", "ASK_SCHEDULE", "ASK_LOST_TIME", "ASK_CAPABILITY",
  "REQUEST_COMPLETION", "ACCUSE_GENERALIZATION", "THREAT_ESCALATION", "PROPOSE_COLLABORATION",
  "EXPRESS_FRUSTRATION", "PASSIVE_AGGRESSIVE", "APOLOGIZE", "CHANGE_TOPIC",
  "ACKNOWLEDGE_CONTEXT", "ACCEPT_PLAN",
];
const ambiguousPairs: Array<[RouterIntent, RouterIntent, V0521AmbiguityType]> = [
  ["ASK_CAPABILITY", "REQUEST_COMPLETION", "REQUEST_VS_CAPABILITY"],
  ["ASK_STATUS", "REQUEST_COMPLETION", "QUESTION_VS_REQUEST"],
  ["EXPRESS_FRUSTRATION", "ACCUSE_GENERALIZATION", "FRUSTRATION_VS_ACCUSATION"],
  ["PROPOSE_COLLABORATION", "REQUEST_COMPLETION", "OFFER_VS_COLLABORATION"],
  ["UNCLEAR", "ASK_STATUS", "UNCLEAR_REFERENCE"],
  ["REQUEST_COMPLETION", "EXPRESS_FRUSTRATION", "MULTI_ACT_SCOPE"],
];
const multiPairs: Array<[RouterIntent, RouterIntent[]]> = [
  ["REQUEST_COMPLETION", ["EXPRESS_FRUSTRATION"]],
  ["ASK_CAPABILITY", ["EXPRESS_FRUSTRATION"]],
  ["PROPOSE_COLLABORATION", ["ACKNOWLEDGE_CONTEXT"]],
  ["ACCUSE_GENERALIZATION", ["EXPRESS_FRUSTRATION"]],
  ["THREAT_ESCALATION", ["REQUEST_COMPLETION"]],
  ["APOLOGIZE", ["PROPOSE_COLLABORATION"]],
  ["REQUEST_COMPLETION", ["EXPRESS_FRUSTRATION", "ACCUSE_GENERALIZATION"]],
];
const claimTypes = CLAIM_TYPES.filter((claim) => claim !== "OTHER_USER_CLAIM") as ClaimType[];
const lookalikeIntents: RouterIntent[] = ["ASK_SCHEDULE", "ASK_STATUS", "ASK_CAPABILITY", "REQUEST_COMPLETION", "ASK_CAUSE"];

function makeLabel(cohort: V0521Cohort, batch: number): Label {
  let primaryIntent: RouterIntent;
  let requiredSecondaryIntents: RouterIntent[] = [];
  let optionalSecondaryIntents: RouterIntent[] = [];
  let acceptablePrimaryIntents: RouterIntent[];
  let claimType: ClaimType | null = null;
  let epistemicStrength: "ASSERTED" | "HEDGED" | null = null;
  let alternativeIntent: RouterIntent | null = null;
  let ambiguityType: V0521AmbiguityType = "NONE";
  if (cohort === "GENUINE_AMBIGUOUS") {
    [primaryIntent, alternativeIntent, ambiguityType] = ambiguousPairs[batch % ambiguousPairs.length]!;
    acceptablePrimaryIntents = [primaryIntent, alternativeIntent];
  } else if (cohort === "MULTI_INTENT") {
    [primaryIntent, requiredSecondaryIntents] = multiPairs[batch % multiPairs.length]!;
    acceptablePrimaryIntents = [primaryIntent];
  } else if (cohort === "CLAIM_PRESENT") {
    primaryIntent = "ASSERT_CLAIM";
    acceptablePrimaryIntents = [primaryIntent];
    claimType = claimTypes[batch % claimTypes.length]!;
    epistemicStrength = batch % 2 === 0 ? "ASSERTED" : "HEDGED";
    optionalSecondaryIntents = batch % 3 === 0 ? ["EXPRESS_FRUSTRATION"] : [];
  } else if (cohort === "NO_CLAIM_LOOKALIKE") {
    primaryIntent = lookalikeIntents[batch % lookalikeIntents.length]!;
    acceptablePrimaryIntents = [primaryIntent];
  } else if (cohort === "META_ATTACK") {
    primaryIntent = "META_PROMPT_ATTACK";
    acceptablePrimaryIntents = [primaryIntent];
  } else if (cohort === "OUT_OF_SCOPE") {
    primaryIntent = "OUT_OF_SCOPE";
    acceptablePrimaryIntents = [primaryIntent];
  } else {
    primaryIntent = clearIntents[batch % clearIntents.length]!;
    acceptablePrimaryIntents = [primaryIntent];
  }
  const allowed = new Set([primaryIntent, ...requiredSecondaryIntents, ...optionalSecondaryIntents]);
  const forbiddenSecondaryIntents = PRIMARY_INTENTS.filter((intent) => !allowed.has(intent));
  return {
    primaryIntent,
    acceptablePrimaryIntents,
    requiredSecondaryIntents,
    optionalSecondaryIntents,
    forbiddenSecondaryIntents,
    claimType,
    epistemicStrength,
    alternativeIntent,
    ambiguityType,
  };
}

const jobs = (Object.keys(cohortPerLocale) as V0521Cohort[]).flatMap((cohort) =>
  (["pt-BR", "en-US"] as const).flatMap((locale) =>
    Array.from({ length: cohortPerLocale[cohort] / BATCH_SIZE }, (_, batch) => ({
      cohort,
      locale,
      batch,
      label: makeLabel(cohort, batch),
    })),
  ),
);
if (jobs.length * BATCH_SIZE !== 3_500) throw new Error("V0521_BLIND_JOB_COUNT_MISMATCH");

const plannedJobs = jobs.map((job) => ({
  batchId: `v0521_${job.cohort}_${job.locale}_${String(job.batch + 1).padStart(2, "0")}`,
  cohort: job.cohort,
  locale: job.locale,
  batch: job.batch,
  styleProfile: styles[job.batch % styles.length],
  labels: job.label,
}));
const planBody = `${JSON.stringify({ schemaVersion: "v0521-blind-generation-plan-1", jobs: plannedJobs }, null, 2)}\n`;
const planHash = createHash("sha256").update(planBody).digest("hex");
await mkdir(resolve("results/v0521"), { recursive: true });
const planPath = resolve("results/v0521/blind-generation-plan.json");
try {
  const existing = await readFile(planPath, "utf8");
  if (existing !== planBody) throw new Error("V0521_LABEL_FIRST_PLAN_CHANGED");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  await writeFile(planPath, planBody);
}

const outputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["utterances"],
  properties: {
    utterances: {
      type: "array",
      minItems: BATCH_SIZE,
      maxItems: BATCH_SIZE,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "claimSourceSpan"],
        properties: { text: { type: "string" }, claimSourceSpan: { type: "string" } },
      },
    },
  },
} as const;
const profile: ModelProfile = {
  id: "v0521-blind-generator-low",
  role: "simulator",
  thinkingLevel: "low",
  maxOutputTokens: 7_000,
  samplingNote: "Label-first blind language generation; no router labels inferred by the generator.",
};

function cohortRules(cohort: V0521Cohort, label: Label): string[] {
  const common = [
    `Every message must perform ${label.primaryIntent}: ${INTENT_DEFINITIONS_V0521[label.primaryIntent]}`,
    "Produce five groups of five genuine paraphrases. Meaning stays stable inside each group while form, length, punctuation, directness, or word order changes.",
    "Write plausible human messages only; no labels, explanations, classifications, or Alex replies.",
  ];
  if (cohort === "GENUINE_AMBIGUOUS") common.push(
    `Every message must preserve both ${label.primaryIntent} and ${label.alternativeIntent} as materially plausible readings without resolving which dominates.`,
    `The ambiguity is ${label.ambiguityType}; it must change likely policy behavior, not merely style.`,
  );
  if (cohort === "MULTI_INTENT") common.push(
    `Every message must independently and explicitly perform these secondary moves: ${label.requiredSecondaryIntents.join(", ")}.`,
    "Do not add any other conversational move merely through tone.",
  );
  if (cohort === "CLAIM_PRESENT") common.push(
    `Every message must present exactly one checkable ${label.claimType} proposition as ${label.epistemicStrength}.`,
    "claimSourceSpan must be the exact shortest contiguous clause that presents that proposition.",
  );
  else common.push("Do not assert a checkable world claim. claimSourceSpan must be an empty string.");
  if (cohort === "NO_CLAIM_LOOKALIKE") common.push(
    "Mention proposition-like content only inside a question, request, wish, conditional, or hypothetical. It must not be asserted as true or likely.",
  );
  if (cohort === "META_ATTACK") common.push("Every message must attempt role change, prompt disclosure, hidden-fact disclosure, free text, or a forced plan ID.");
  if (cohort === "OUT_OF_SCOPE") common.push("Every message must be genuinely unrelated to Alex, the slides, the project, or this conversation.");
  return common;
}

const outputDirectory = resolve("results/v0521/blind-generation-batches");
await mkdir(outputDirectory, { recursive: true });
const client = new V0521ApiClient(apiKey, model);
let cursor = 0;
let complete = 0;
async function worker() {
  for (;;) {
    const index = cursor++;
    if (index >= jobs.length) return;
    const job = jobs[index]!;
    const batchId = plannedJobs[index]!.batchId;
    const outputPath = resolve(outputDirectory, `${batchId}.json`);
    try { await readFile(outputPath); complete++; continue; } catch {}
    const call = await client.call("blind_generation", batchId, {
      systemInstruction: "Generate a blind linguistic holdout from labels fixed before generation. Never classify your own output and never answer as Alex.",
      input: JSON.stringify({
        scenario: "Alex is the user's teammate. Two research slides are unfinished and the presentation deadline is Friday.",
        locale: job.locale,
        cohort: job.cohort,
        canonicalLabels: job.label,
        styleProfile: styles[job.batch % styles.length],
        count: BATCH_SIZE,
        constraints: [
          ...cohortRules(job.cohort, job.label),
          job.locale === "pt-BR"
            ? "Write directly in natural contemporary Brazilian Portuguese; do not translate literally or stereotype slang."
            : "Write directly in natural conversational US English.",
          "Do not reuse examples or sentence frames from earlier datasets.",
        ],
      }),
      schema: outputSchema,
      profile,
      timeoutMs: 180_000,
    });
    const utterances = (call.rawOutput as any)?.utterances;
    if (!Array.isArray(utterances) || utterances.length !== BATCH_SIZE)
      throw new Error(`INVALID_V0521_GENERATION_COUNT:${batchId}`);
    const normalized = utterances.map((row: any, utteranceIndex: number) => {
      if (typeof row?.text !== "string" || row.text.trim().length < 2 || typeof row.claimSourceSpan !== "string")
        throw new Error(`INVALID_V0521_GENERATED_ROW:${batchId}:${utteranceIndex}`);
      if (job.label.claimType && (!row.claimSourceSpan || !row.text.includes(row.claimSourceSpan)))
        throw new Error(`INVALID_V0521_CLAIM_SPAN:${batchId}:${utteranceIndex}`);
      if (!job.label.claimType && row.claimSourceSpan)
        throw new Error(`UNEXPECTED_V0521_CLAIM_SPAN:${batchId}:${utteranceIndex}`);
      return {
        id: `${batchId}_U${String(utteranceIndex + 1).padStart(2, "0")}`,
        groupId: `${batchId}_G${Math.floor(utteranceIndex / 5) + 1}`,
        text: row.text.trim(),
        claimSourceSpan: row.claimSourceSpan,
      };
    });
    await writeFile(outputPath, `${JSON.stringify({
      schemaVersion: "v0521-blind-generation-batch-1",
      generationPlanHash: planHash,
      index,
      cohort: job.cohort,
      locale: job.locale,
      batch: job.batch,
      styleProfile: styles[job.batch % styles.length],
      labels: job.label,
      usage: call.usage,
      latencyMs: call.latencyMs,
      estimatedCostUsd: call.estimatedCostUsd,
      sequence: call.sequence,
      transportRetries: call.transportRetries,
      utterances: normalized,
    }, null, 2)}\n`);
    complete++;
    if (complete % 10 === 0) process.stdout.write(`v0521-blind-gen ${complete}/${jobs.length}\n`);
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
process.stdout.write(`V0521_BLIND_GENERATION_COMPLETE jobs=${jobs.length} utterances=${jobs.length * BATCH_SIZE}\n`);
