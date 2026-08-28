import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { V0521ApiClient } from "./api-client.js";
import type { V0521DatasetCase } from "./dataset-contracts.js";
import { routeBatchV0521 } from "./router.js";

const key = process.env.GEMINI_API_KEY?.trim();
const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.7-flash";
if (!key || key === "COLE_SUA_CHAVE_AQUI") throw new Error("Configure GEMINI_API_KEY only in ai-lab/.env");
const runtimeSet = JSON.parse(await readFile(resolve("results/v0521/runtime-set.json"), "utf8"));
const sample = runtimeSet.cases as V0521DatasetCase[];
if (sample.length !== 300) throw new Error(`STABILITY_SAMPLE_SHORT:${sample.length}`);
const jobs = [2].flatMap((repeat) =>
  Array.from({ length: 60 }, (_, batch) => ({ repeat, batch, rows: sample.slice(batch * 5, batch * 5 + 5) })),
);
const outDir = resolve("results/v0521/stability-batches");
await mkdir(outDir, { recursive: true });
const client = new V0521ApiClient(key, model);
let cursor = 0, complete = 0;
async function worker() {
  for (;;) {
    const index = cursor++;
    if (index >= jobs.length) return;
    const job = jobs[index]!;
    const path = resolve(outDir, `R${job.repeat}_${String(job.batch + 1).padStart(3, "0")}.json`);
    try { await readFile(path); complete++; continue; } catch {}
    const inputs = job.rows.map((row) => ({ id: `${row.id}__R${job.repeat}`, locale: row.locale, text: row.text }));
    try {
      const result = await routeBatchV0521(client, "stability", `stability_r${job.repeat}_${job.batch + 1}`, inputs);
      await writeFile(path, `${JSON.stringify({ schemaVersion: "v0521-stability-batch-1", repeat: job.repeat, batch: job.batch, sourceIds: job.rows.map((row) => row.id), expected: job.rows, ...result }, null, 2)}\n`);
    } catch (error) {
      await writeFile(path, `${JSON.stringify({ schemaVersion: "v0521-stability-batch-1", repeat: job.repeat, batch: job.batch, sourceIds: job.rows.map((row) => row.id), expected: job.rows, routes: [], failure: String((error as Error).message) }, null, 2)}\n`);
    }
    complete++;
    if (complete % 20 === 0) process.stdout.write(`stability ${complete}/${jobs.length}\n`);
  }
}
await Promise.all(Array.from({ length: 5 }, worker));
process.stdout.write("V0521_STABILITY_REPEAT2_COMPLETE; blind=R1 runtime-individual=R3\n");
