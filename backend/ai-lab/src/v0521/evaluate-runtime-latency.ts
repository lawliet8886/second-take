import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { evaluateArtifacts, stats, type RouteArtifactV0521 } from "./evaluation-core.js";

const directory = resolve("results/v0521/runtime-individual");
const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();
const artifacts = await Promise.all(files.map(async (file) => JSON.parse(await readFile(resolve(directory, file), "utf8")) as RouteArtifactV0521));
const evaluated = evaluateArtifacts(artifacts, new Set());
const firstAttempt = artifacts.filter((artifact) => !artifact.failure && artifact.transportRetries === 0);
const retried = artifacts.filter((artifact) => (artifact.transportRetries ?? 0) > 0);
const failed = artifacts.filter((artifact) => artifact.failure);
const attempts = artifacts.flatMap((artifact: any) => artifact.attempts ?? []);
const firstAttemptSuccesses = attempts.filter((attempt: any) => attempt.attempt === 0 && attempt.outcome === "SUCCESS");
const providerErrors = Object.fromEntries(
  ["ECONNRESET", "HTTP_500", "CAPACITY", "TIMEOUT", "OTHER"].map((kind) => [
    kind,
    attempts.filter((attempt: any) => attempt.outcome === "ERROR" && attempt.errorClass === kind).length,
  ]),
);
const payload = {
  schemaVersion: "v0521-runtime-results-1",
  generatedAt: new Date().toISOString(),
  requests: artifacts.length,
  successful: artifacts.length - failed.length,
  firstAttemptSuccessful: firstAttempt.length,
  firstAttemptApiLatency: stats(firstAttemptSuccesses.map((attempt: any) => attempt.latencyMs)),
  successfulApiLatency: stats(artifacts.filter((artifact) => !artifact.failure).map((artifact) => artifact.latencyMs)),
  fullRoutingLatency: stats(artifacts.filter((artifact) => !artifact.failure).map((artifact) => artifact.fullLatencyMs ?? NaN)),
  localProcessingLatency: stats(artifacts.filter((artifact) => !artifact.failure).map((artifact) => artifact.localProcessingMs ?? NaN)),
  transportRetryRequests: retried.length,
  transportRetryRate: retried.length / Math.max(1, artifacts.length),
  transportRetryAttempts: retried.reduce((sum, artifact) => sum + (artifact.transportRetries ?? 0), 0),
  providerErrors: { ...providerErrors, terminalFailures: failed.length },
  functional: evaluated.summary,
};
await writeFile(resolve("results/v0521/runtime-results.json"), `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
