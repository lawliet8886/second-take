import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ModelProfile } from "../contracts/results.js";
import { challengePlan } from "./challenge-plan.js";
import { V0531VertexClient } from "./vertex.js";

const BATCH = 25, directory = resolve("results/v0531/challenge-generation");
const project = process.env.GOOGLE_CLOUD_PROJECT?.trim() || execFileSync("cmd.exe", ["/d", "/s", "/c", "gcloud config get-value project"], { encoding: "utf8" }).trim();
if (!project) throw new Error("VERTEX_PROJECT_REQUIRED");
const client = new V0531VertexClient(project, 2);
const profile: ModelProfile = { id: "v0531-challenge-generator", role: "simulator", thinkingLevel: "low", maxOutputTokens: 8_000, samplingNote: "Label-first contrastive ambiguity challenge." };
const schema = { type: "object", additionalProperties: false, required: ["utterances"], properties: { utterances: { type: "array", minItems: BATCH, maxItems: BATCH, items: { type: "object", additionalProperties: false, required: ["text"], properties: { text: { type: "string" } } } } } } as const;

function constraints(job: ReturnType<typeof challengePlan>[number]) {
  const lines = [`Generate ${BATCH} distinct plausible user messages in the Alex teammate scenario.`, `Surface style: ${job.style}.`, `The dominant intended move is ${job.primarySense}.`, job.locale === "pt-BR" ? "Use natural contemporary Brazilian Portuguese." : "Use natural conversational US English.", "Never answer as Alex; output only user utterances."];
  if (job.ambiguityExpected) lines.push(`Every utterance must leave BOTH ${job.primarySense} and ${job.competingSense} materially plausible. The readings must lead to meaningfully different responses; do not resolve the contrast.`);
  else if (job.cohort === "CLEAR_FAMILY_CONTROL") lines.push(`Every utterance must clearly realize ${job.primarySense}; ${job.competingSense} must NOT be a materially plausible reading. Use explicit wording that disambiguates naturally.`);
  else lines.push(`Every utterance must clearly realize ${job.canonicalPrimaryIntent} and must not plausibly perform the competing known-family move. These are negative controls outside the probe families.`);
  lines.push("Vary wording, length, punctuation, directness, contractions/abbreviations, and word order without producing nonsense or checkable new world facts.");
  return lines;
}

await mkdir(directory, { recursive: true });
const jobs = challengePlan(); let cursor = 0, calls = 0, retries = 0, cost = 0;
async function worker() { for (;;) {
  const job = jobs[cursor++]; if (!job) return;
  const path = resolve(directory, `${job.batchId}.json`);
  try { JSON.parse(await readFile(path, "utf8")); continue; } catch {}
  const call = await client.call("blind_generation", job.batchId, { systemInstruction: "Generate a label-first blind linguistic challenge. Follow the fixed semantic contrast exactly. Do not classify or explain.", input: JSON.stringify({ scenario: "Alex is the user's teammate; two research slides are unfinished and the presentation deadline is Friday.", labels: job, constraints: constraints(job) }), schema, profile, timeoutMs: 60_000 });
  const utterances = (call.rawOutput as any)?.utterances;
  if (!Array.isArray(utterances) || utterances.length !== BATCH || utterances.some((x: any) => typeof x?.text !== "string" || x.text.trim().length < 2)) throw new Error(`INVALID_BATCH:${job.batchId}`);
  await writeFile(path, `${JSON.stringify({ schemaVersion: "v0531-generation-batch-1", job, transport: { route: call.transportRoute, attempts: call.attempts, latencyMs: call.fullLatencyMs }, usage: call.usage, estimatedCostUsd: call.estimatedCostUsd, utterances: utterances.map((x: any, i: number) => ({ id: `${job.batchId}_U${String(i + 1).padStart(2, "0")}`, groupId: `${job.batchId}_G${Math.floor(i / 5) + 1}`, text: x.text.trim() })) }, null, 2)}\n`);
  calls++; retries += call.transportRetries; cost += call.estimatedCostUsd;
  if (calls % 8 === 0) process.stdout.write(`V0531_GENERATION ${calls}/${jobs.length}\n`);
} }
await Promise.all(Array.from({ length: 4 }, () => worker()));
process.stdout.write(`${JSON.stringify({ jobs: jobs.length, cases: 1800, calls, retries, cost }, null, 2)}\n`);
