import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { VertexTransportFailure, VertexGlobalStructuredClient } from "../v0521-vertex/transport.js";
import { routeBatchVertexV0521 } from "../v0521-vertex/router-call.js";
import type { V0531ChallengeCase } from "./challenge-contracts.js";

const dataset = JSON.parse(await readFile(resolve("results/v0531/challenge.json"), "utf8")) as { cases: V0531ChallengeCase[] };
const project = process.env.GOOGLE_CLOUD_PROJECT?.trim() || execFileSync("cmd.exe", ["/d", "/s", "/c", "gcloud config get-value project"], { encoding: "utf8" }).trim();
const client = new VertexGlobalStructuredClient(project), directory = resolve("results/v0531/router-routes");
await mkdir(directory, { recursive: true });
const batches = Array.from({ length: Math.ceil(dataset.cases.length / 5) }, (_, index) => ({ index, cases: dataset.cases.slice(index * 5, index * 5 + 5) }));
let cursor = 0, completed = 0, failures = 0;
async function worker() { for (;;) {
  const job = batches[cursor++]; if (!job) return;
  const id = `B${String(job.index + 1).padStart(3, "0")}`, path = resolve(directory, `${id}.json`);
  try { JSON.parse(await readFile(path, "utf8")); completed++; continue; } catch {}
  try {
    const call = await routeBatchVertexV0521(client, "blind_routing", `v0531_${id}`, job.cases.map((row) => ({ id: row.id, locale: row.locale, text: row.text })));
    await writeFile(path, `${JSON.stringify({ schemaVersion: "v0531-router-route-1", id, expected: job.cases, ...call }, null, 2)}\n`);
  } catch (error) {
    failures++; const transport = error instanceof VertexTransportFailure ? { attempts: error.attempts, fullLatencyMs: error.fullLatencyMs } : null;
    await writeFile(path, `${JSON.stringify({ schemaVersion: "v0531-router-route-1", id, expected: job.cases, failure: String((error as Error)?.message ?? error), transport }, null, 2)}\n`);
  }
  completed++; if (completed % 20 === 0) process.stdout.write(`V0531_ROUTER ${completed}/${batches.length} failures=${failures}\n`);
} }
await Promise.all(Array.from({ length: 4 }, () => worker()));
process.stdout.write(`${JSON.stringify({ batches: batches.length, cases: dataset.cases.length, completed, failures }, null, 2)}\n`);
