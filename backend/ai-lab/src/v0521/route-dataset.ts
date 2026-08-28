import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { V0521ApiClient, type V0521Stage } from "./api-client.js";
import type { V0521Dataset } from "./dataset-contracts.js";
import { routeBatchV0521 } from "./router.js";

const mode = process.argv[2] as "calibration" | "blind";
if (!(["calibration", "blind"] as const).includes(mode)) throw new Error("USAGE: route-dataset.ts calibration|blind");
const key = process.env.GEMINI_API_KEY?.trim();
const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.7-flash";
if (!key || key === "COLE_SUA_CHAVE_AQUI") throw new Error("Configure GEMINI_API_KEY only in ai-lab/.env");
const dataset = JSON.parse(await readFile(resolve(`results/v0521/${mode}-dataset.json`), "utf8")) as V0521Dataset;
const batches = Array.from({ length: Math.ceil(dataset.cases.length / 5) }, (_, index) => dataset.cases.slice(index * 5, index * 5 + 5));
const outDir = resolve(`results/v0521/${mode}-router-batches`);
await mkdir(outDir, { recursive: true });
const client = new V0521ApiClient(key, model);
const stage: V0521Stage = mode === "calibration" ? "calibration" : "blind_routing";
let cursor = 0, complete = 0;
async function worker() {
  for (;;) {
    const index = cursor++;
    if (index >= batches.length) return;
    const expected = batches[index]!;
    const path = resolve(outDir, `${String(index + 1).padStart(4, "0")}.json`);
    try { await readFile(path); complete++; continue; } catch {}
    const started = performance.now();
    try {
      const result = await routeBatchV0521(client, stage, `${mode}_${index + 1}`, expected.map(({ id, locale, text }) => ({ id, locale, text })));
      const fullLatencyMs = Math.round(performance.now() - started);
      await writeFile(path, `${JSON.stringify({ schemaVersion: `v0521-${mode}-route-1`, batchIndex: index, expected, ...result, fullLatencyMs, localProcessingMs: Math.max(0, fullLatencyMs - result.latencyMs) }, null, 2)}\n`);
    } catch (error) {
      await writeFile(path, `${JSON.stringify({ schemaVersion: `v0521-${mode}-route-1`, batchIndex: index, expected, routes: [], failure: String((error as Error).message), fullLatencyMs: Math.round(performance.now() - started), usage: null, latencyMs: null, estimatedCostUsd: 0, transportRetries: null, semanticRetry: 1 }, null, 2)}\n`);
    }
    complete++;
    if (complete % 25 === 0) process.stdout.write(`${mode} ${complete}/${batches.length}\n`);
  }
}
await Promise.all(Array.from({ length: 15 }, worker));
process.stdout.write(`V0521_${mode.toUpperCase()}_ROUTING_COMPLETE ${dataset.cases.length}\n`);
