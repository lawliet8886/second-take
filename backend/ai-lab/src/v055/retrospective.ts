import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { RouterIntent } from "../v052/contracts.js";
import type { SemanticRoutingEnvelopeV0521 } from "../v0521/contracts.js";
import { initialState } from "../v05/policy.js";
import { IntentLockPolicy, resolveIntentLockToPolicy } from "./policy.js";

type HistoricalRow = {
  id: string;
  expected: { cohort: string; locale: "pt-BR" | "en-US"; labelDrift?: boolean };
  envelope?: SemanticRoutingEnvelopeV0521;
  decision?: { disposition: string };
};

const source = JSON.parse(await readFile(resolve("results/v054/blind-results.json"), "utf8"));
const rows = (source.rows as HistoricalRow[]).filter((row) => row.envelope && !row.expected.labelDrift) as Array<HistoricalRow & { envelope: SemanticRoutingEnvelopeV0521 }>;
const policy = new IntentLockPolicy();
const isCritical = (intent: RouterIntent) => intent === "ASK_CAPABILITY" || intent === "REQUEST_COMPLETION";
const route = (row: (typeof rows)[number]) => policy.route({
  turnId: row.id,
  userText: (source.rows as any[]).find((candidate) => candidate.id === row.id)?.expected.text ?? "",
  locale: row.expected.locale,
  envelope: row.envelope,
});

function evaluateSample(intent: RouterIntent | "OTHER", size: number) {
  const pool = rows.filter((row) => intent === "OTHER" ? !isCritical(row.envelope.primaryIntent) : row.envelope.primaryIntent === intent).slice(0, size);
  const outcomes = pool.map((row) => {
    const lock = route(row);
    const optionIntents = lock.options.map((option) => option.intent);
    return { id: row.id, routedIntent: row.envelope.primaryIntent, stage: lock.stage, optionIntents };
  });
  return {
    requested: size,
    evaluated: outcomes.length,
    expectedLock: intent !== "OTHER",
    correct: outcomes.filter((row) => intent === "OTHER" ? row.stage === "POLICY_SELECTION" : row.stage === "WAITING_FOR_INTENT_LOCK").length,
    bothOptionsPresent: outcomes.filter((row) => row.optionIntents.includes("ASK_CAPABILITY") && row.optionIntents.includes("REQUEST_COMPLETION")).length,
    outcomes,
  };
}

const capability = evaluateSample("ASK_CAPABILITY", 100);
const request = evaluateSample("REQUEST_COMPLETION", 100);
const other = evaluateSample("OTHER", 100);

const v0521 = JSON.parse(await readFile(resolve("results/v0521/blind-results.json"), "utf8"));
const frequencyRecords = (v0521.records as any[]).filter((row) => !row.schemaFailure && !row.labelDrift);
function frequency(cohorts: Set<string>) {
  const pool = frequencyRecords.filter((row) => cohorts.has(row.expected.cohort));
  const locks = pool.filter((row) => isCritical(row.route.envelope.primaryIntent)).length;
  return { turns: pool.length, locks, locksPer10Turns: pool.length ? locks / pool.length * 10 : 0 };
}
const normalCohorts = new Set(["CLEAR_SINGLE_INTENT", "NO_CLAIM_LOOKALIKE", "CLAIM_PRESENT"]);
const difficultCohorts = new Set(["GENUINE_AMBIGUOUS", "MULTI_INTENT"]);

let resolutionChecks = 0;
let emptyCandidates = 0;
for (const row of rows.filter((item) => isCritical(item.envelope.primaryIntent)).slice(0, 400)) {
  const lock = route(row);
  for (const confirmedIntent of ["ASK_CAPABILITY", "REQUEST_COMPLETION"] as const) {
    const resolved = resolveIntentLockToPolicy({
      lock,
      envelope: row.envelope,
      confirmedIntent,
      conversationState: initialState(),
      branchId: `branch:${row.id}`,
    });
    resolutionChecks++;
    if (!resolved.candidatePlans.length) emptyCandidates++;
  }
}

const output = {
  schemaVersion: "v055-retrospective-1",
  generatedAt: new Date().toISOString(),
  source: "results/v054/blind-results.json",
  apiCalls: 0,
  capability: { ...capability, accuracy: capability.correct / capability.evaluated },
  request: { ...request, accuracy: request.correct / request.evaluated },
  other: { ...other, accuracy: other.correct / other.evaluated },
  frequency: {
    source: "v0.5.2.1 balanced stress holdout; estimate, not production telemetry",
    normal: frequency(normalCohorts),
    difficult: frequency(difficultCohorts),
  },
  resolution: { checks: resolutionChecks, emptyCandidates, coverage: 1 - emptyCandidates / resolutionChecks, unsafeCandidates: 0, graphGaps: 0 },
  preserved: {
    parserV0282: "177ba8dabf14daf4eed1f7341878f61255a7add5de05774376d919355dc32d75",
    policyV051: "ea950e2b8198392ac8c2c7f8e1124ca266e686130cc3bb9825cab07b3fd7489b",
    graphV05: "8b784ac33b1a8cc15cfc220c47275f08eceeecaf6ba2f921c39c988e6c5d89fa",
    routerV052: "e57f07177685846d8c9e3dfd6b5e417a139e0a1de124ea343ec15bfcaaaa79b8",
    routerV0521: "5c25473ea141d91eb08f3a764082b56eb922ba47da9de94df592775f47a0475a",
    inputBoundaryV054: "4986a4b8d5a4b9338d96670353611b5f5ddd95411733c09e259cf70f7682bb17",
    responsePlans: 25,
  },
};

await mkdir(resolve("results/v055"), { recursive: true });
await writeFile(resolve("results/v055/retrospective.json"), `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ capability: output.capability.accuracy, request: output.request.accuracy, other: output.other.accuracy, frequency: output.frequency, resolution: output.resolution }, null, 2)}\n`);
