import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { V0521ApiClient } from "./api-client.js";
import type { V0521Dataset } from "./dataset-contracts.js";
import { routeSingleV0521 } from "./router.js";

const key = process.env.GEMINI_API_KEY?.trim();
const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.7-flash";
if (!key || key === "COLE_SUA_CHAVE_AQUI") throw new Error("Configure GEMINI_API_KEY only in ai-lab/.env");
const dataset = JSON.parse(await readFile(resolve("results/v0521/blind-dataset.json"), "utf8")) as V0521Dataset;
const order = (id: string) => createHash("sha256").update(`v0521-runtime:${id}`).digest("hex");
const buckets = new Map<string, typeof dataset.cases>();
for (const row of dataset.cases) {
  const key = `${row.locale}|${row.cohort}|${row.difficultyProfile}`;
  const values = buckets.get(key) ?? [];
  values.push(row);
  buckets.set(key, values);
}
for (const values of buckets.values()) values.sort((a, b) => order(a.id).localeCompare(order(b.id)));
const sample: typeof dataset.cases = [];
const keys = [...buckets.keys()].sort();
for (let round = 0; sample.length < 300; round++) {
  let added = 0;
  for (const bucket of keys) {
    const row = buckets.get(bucket)![round];
    if (row && sample.length < 300) { sample.push(row); added++; }
  }
  if (!added) break;
}
if (sample.length !== 300) throw new Error(`RUNTIME_SAMPLE_SHORT:${sample.length}`);
const runtimeSet = { schemaVersion: "v0521-runtime-set-1", createdAt: new Date().toISOString(), cases: sample };
const runtimeBody = `${JSON.stringify(runtimeSet, null, 2)}\n`;
const runtimeHash = createHash("sha256").update(runtimeBody).digest("hex");
await mkdir(resolve("results/v0521"), { recursive: true });
try {
  const freeze = JSON.parse(await readFile(resolve("results/v0521/runtime-set-freeze.json"), "utf8"));
  const existing = await readFile(resolve("results/v0521/runtime-set.json"), "utf8");
  if (createHash("sha256").update(existing).digest("hex") !== freeze.runtimeSetHash)
    throw new Error("V0521_RUNTIME_SET_CHANGED");
} catch (error) {
  if (String((error as Error).message).includes("V0521_RUNTIME_SET_CHANGED")) throw error;
  await writeFile(resolve("results/v0521/runtime-set.json"), runtimeBody, { flag: "wx" });
  await writeFile(resolve("results/v0521/runtime-set-freeze.json"), `${JSON.stringify({ schemaVersion: "v0521-runtime-set-freeze-1", frozenAt: new Date().toISOString(), runtimeSetHash: runtimeHash, size: sample.length, ptBR: sample.filter((row) => row.locale === "pt-BR").length, enUS: sample.filter((row) => row.locale === "en-US").length }, null, 2)}\n`, { flag: "wx" });
}
const outDir = resolve("results/v0521/runtime-individual");
await mkdir(outDir, { recursive: true });
const client = new V0521ApiClient(key, model);
let cursor = 0, complete = 0;
async function worker() {
  for (;;) {
    const index = cursor++;
    if (index >= sample.length) return;
    const expected = sample[index]!;
    const path = resolve(outDir, `${String(index + 1).padStart(3, "0")}.json`);
    try { await readFile(path); complete++; continue; } catch {}
    const started = performance.now();
    try {
      const result = await routeSingleV0521(client, "runtime_latency", `runtime_${index + 1}`, { id: expected.id, locale: expected.locale, text: expected.text });
      const fullLatencyMs = Math.round(performance.now() - started);
      await writeFile(path, `${JSON.stringify({ schemaVersion: "v0521-runtime-individual-1", index, expected: [expected], ...result, fullLatencyMs, localProcessingMs: Math.max(0, fullLatencyMs - result.fullLatencyMs) }, null, 2)}\n`);
    } catch (error) {
      await writeFile(path, `${JSON.stringify({ schemaVersion: "v0521-runtime-individual-1", index, expected: [expected], routes: [], failure: String((error as Error).message), fullLatencyMs: Math.round(performance.now() - started), latencyMs: null, localProcessingMs: null, estimatedCostUsd: 0, transportRetries: null, semanticRetry: 1 }, null, 2)}\n`);
    }
    complete++;
    if (complete % 25 === 0) process.stdout.write(`runtime ${complete}/${sample.length}\n`);
  }
}
await Promise.all(Array.from({ length: 5 }, worker));
process.stdout.write("V0521_RUNTIME_INDIVIDUAL_COMPLETE 300\n");
