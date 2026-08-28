import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { initialState } from "../v05/policy.js";
import { candidatePlansFromRouting } from "../v052/policy.js";
import { classifyClaim } from "../v052/validator.js";
import { projectEnvelopeForFrozenPolicy } from "../v0521/router.js";
import { ClarificationGate } from "../v053/gate.js";
import { runProbeBatch } from "./probe.js";
import { planContrastiveProbe } from "./trigger.js";
import { V0531TransportFailure, V0531VertexClient } from "./vertex.js";
import type { ContrastiveProbeRequest } from "./contracts.js";

const sourceDir = resolve("results/v0531/router-routes"), outputDir = resolve("results/v0531/probe-routes");
await mkdir(outputDir, { recursive: true });
const files = (await readdir(sourceDir)).filter((x) => x.endsWith(".json")).sort();
const gate = new ClarificationGate(); const pending: Array<{ request: ContrastiveProbeRequest; context: any }> = [];
for (const file of files) {
  const artifact = JSON.parse(await readFile(resolve(sourceDir, file), "utf8")); if (artifact.failure) continue;
  for (const route of artifact.routes) {
    const expected = artifact.expected.find((x: any) => x.id === route.id), envelope = route.envelope;
    const plans = candidatePlansFromRouting(initialState(), route.locale, route.text, projectEnvelopeForFrozenPolicy(envelope));
    const input = { id: route.id, locale: route.locale, userText: route.text, envelope, candidatePlanIds: plans.map((p) => p.id), claimStatuses: envelope.userClaimCandidates.map((c: any) => ({ ...c, status: classifyClaim(c.claimType) })), currentState: initialState() };
    const baseDecision = gate.decide(input), trigger = planContrastiveProbe(input, baseDecision);
    if (trigger.invoke) pending.push({ request: { id: route.id, locale: route.locale, userText: route.text, primarySense: trigger.primarySense, competingSense: trigger.competingSense, ambiguityClass: trigger.ambiguityClass, context: { tension: input.currentState.tension, openness: input.currentState.openness, resolutionStage: input.currentState.resolutionStage } }, context: { expected, route, input, baseDecision, trigger } });
  }
}
const project = process.env.GOOGLE_CLOUD_PROJECT?.trim() || execFileSync("cmd.exe", ["/d", "/s", "/c", "gcloud config get-value project"], { encoding: "utf8" }).trim();
const client = new V0531VertexClient(project, 2), batches = Array.from({ length: Math.ceil(pending.length / 5) }, (_, i) => ({ index: i, rows: pending.slice(i * 5, i * 5 + 5) }));
let cursor = 0, completed = 0, failures = 0;
async function worker() { for (;;) {
  const job = batches[cursor++]; if (!job) return; const id = `P${String(job.index + 1).padStart(3, "0")}`, path = resolve(outputDir, `${id}.json`);
  try { JSON.parse(await readFile(path, "utf8")); completed++; continue; } catch {}
  try { const call = await runProbeBatch(client, "blind_probe", id, job.rows.map((x) => x.request)); await writeFile(path, `${JSON.stringify({ schemaVersion: "v0531-probe-route-1", id, contexts: job.rows.map((x) => x.context), ...call }, null, 2)}\n`); }
  catch (error) { failures++; const transport = error instanceof V0531TransportFailure ? { attempts: error.attempts, fullLatencyMs: error.fullLatencyMs } : null; await writeFile(path, `${JSON.stringify({ schemaVersion: "v0531-probe-route-1", id, contexts: job.rows.map((x) => x.context), failure: String((error as Error)?.message ?? error), transport }, null, 2)}\n`); }
  completed++; if (completed % 20 === 0) process.stdout.write(`V0531_PROBE ${completed}/${batches.length} failures=${failures}\n`);
} }
await Promise.all(Array.from({ length: 4 }, () => worker()));
process.stdout.write(`${JSON.stringify({ triggered: pending.length, batches: batches.length, completed, failures }, null, 2)}\n`);
