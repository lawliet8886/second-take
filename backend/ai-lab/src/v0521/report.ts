import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { v0521CallLedger } from "./api-client.js";

async function optional(path: string): Promise<any> {
  try { return JSON.parse(await readFile(resolve(path), "utf8")); } catch { return null; }
}
async function artifacts(directory: string): Promise<any[]> {
  try {
    const files = (await readdir(resolve(directory))).filter((file) => file.endsWith(".json"));
    return Promise.all(files.map(async (file) => JSON.parse(await readFile(resolve(directory, file), "utf8"))));
  } catch { return []; }
}

const calibration = await optional("results/v0521/calibration-results.json");
const blind = await optional("results/v0521/blind-results.json");
const stability = await optional("results/v0521/stability-results.json");
const runtime = await optional("results/v0521/runtime-results.json");
const routerFreeze = await optional("results/v0521/router-freeze.json");
const blindFreeze = await optional("results/v0521/blind-freeze.json");
const runtimeFreeze = await optional("results/v0521/runtime-set-freeze.json");
const generation = await optional("results/v0521/blind-generation-results.json");
const ledger = await v0521CallLedger();
const raw = [
  ...(await artifacts("results/v0521/calibration-router-batches")),
  ...(await artifacts("results/v0521/blind-router-batches")),
  ...(await artifacts("results/v0521/stability-batches")),
  ...(await artifacts("results/v0521/runtime-individual")),
];
const usage = raw.reduce((sum, artifact) => ({
  inputTokens: sum.inputTokens + (artifact.usage?.inputTokens ?? 0),
  outputTokens: sum.outputTokens + (artifact.usage?.outputTokens ?? 0),
  thinkingTokens: sum.thinkingTokens + (artifact.usage?.thinkingTokens ?? 0),
}), { inputTokens: 0, outputTokens: 0, thinkingTokens: 0 });
const routingCost = raw.reduce((sum, artifact) => sum + (artifact.estimatedCostUsd ?? 0), 0);
const generationCost = generation?.totalCostUsd ?? 0;
const totalCostUsd = routingCost + generationCost;
const routedCount = raw.reduce((sum, artifact) => sum + (artifact.routes?.length ?? 0), 0);
const callsByStage = Object.fromEntries(
  ["calibration", "blind_generation", "blind_routing", "stability", "runtime_latency", "qa"].map((stage) => [
    stage,
    ledger.entries.filter((entry: any) => entry.stage === stage).length,
  ]),
);
const transportRetries = ledger.entries.filter((entry: any) => entry.transportRetry > 0).length;
const gates = blind?.summary ? {
  unsafe: blind.summary.unsafeCandidates === 0,
  coverage: blind.summary.candidateCoverage >= 0.98,
  family: blind.summary.intentFamilyAccuracy >= 0.97,
  acceptable: blind.summary.acceptableIntentAccuracy >= 0.95,
  ambiguity: blind.summary.ambiguousPrecision >= 0.95 && blind.summary.ambiguousRecall >= 0.95,
  secondary: blind.summary.secondaryPrecision >= 0.85,
  claims: blind.summary.claimPrecision >= 0.95 && blind.summary.claimRecall >= 0.9 && blind.summary.noClaimOverExtraction <= 0.05,
  sameInput: (stability?.withinAcceptableSetRate ?? 0) >= 0.98,
  runtime: (runtime?.fullRoutingLatency?.p50 ?? Infinity) < 5_000 && (runtime?.fullRoutingLatency?.p95 ?? Infinity) < 12_000,
} : null;
const safety = gates?.unsafe ?? false;
const functionalPass = gates ? Object.entries(gates).filter(([key]) => key !== "runtime").every(([, value]) => value) : false;
const status = !safety ? "RED" : functionalPass && gates!.runtime ? "GREEN" : "YELLOW";
const recommendation = status === "GREEN"
  ? "READY_FOR_SELECTOR_STRESS_TEST"
  : functionalPass
    ? "READY_WITH_KNOWN_LIMITATIONS"
    : "ONE_FINAL_ROUTER_MICRO_FIX";
const costPerRoutingUsd = routingCost / Math.max(1, routedCount);
const payload = {
  schemaVersion: "v0521-final-report-1",
  generatedAt: new Date().toISOString(),
  status,
  recommendation,
  readyForSelectorStressTest: functionalPass,
  model: { name: "gemini-3.7-flash", thinking: "low", structuredOutput: true },
  calls: { total: ledger.count, byStage: callsByStage, transportRetries },
  cost: { totalCostUsd, routingCostUsd: routingCost, generationCostUsd: generationCost, costPerRoutingUsd, sixTurnRoutingCostUsd: costPerRoutingUsd * 6, usage },
  freezes: { router: routerFreeze, blind: blindFreeze, runtime: runtimeFreeze },
  calibration: calibration?.summary ?? null,
  blind: blind?.summary ?? null,
  stability,
  runtime,
  gates,
};
await writeFile(resolve("results/v0521/final-report.json"), `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
