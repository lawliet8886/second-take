import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { V052ApiClient } from "./api-client.js";
import { routeBatch } from "./router.js";

const mode = process.argv[2] as "pilot" | "development" | "validation";
if (!['pilot','development','validation'].includes(mode)) throw new Error("pilot|development|validation required");
const key = process.env.GEMINI_API_KEY?.trim(), model = process.env.GEMINI_MODEL?.trim() || "gemini-3.7-flash";
if (!key || key === "COLE_SUA_CHAVE_AQUI") throw new Error("Configure GEMINI_API_KEY only in ai-lab/.env");
if (model !== "gemini-3.7-flash") throw new Error("V052_MODEL_MUST_BE_gemini-3.7-flash");
const split = JSON.parse(await readFile(resolve("results/v052/existing-split.json"), "utf8"));
const all = mode === "validation" ? split.validation.rows : split.development.rows;
const rows = mode === "pilot" ? all.slice(0, 500) : mode === "development" ? all.slice(0, 1000) : all;
const batches = Array.from({ length: Math.ceil(rows.length / 5) }, (_, i) => rows.slice(i * 5, i * 5 + 5));
const outDir = resolve(`results/v052/existing-${mode}-batches`);
await mkdir(outDir, { recursive: true });
const client = new V052ApiClient(key, model);
let cursor = 0, complete = 0;
async function worker() {
  for (;;) {
    const index = cursor++;
    if (index >= batches.length) return;
    const file = resolve(outDir, `${String(index + 1).padStart(4, "0")}.json`);
    try { await readFile(file); complete++; continue; } catch {}
    const batch = batches[index]!;
    const result = await routeBatch(client, "router_calibration", `${mode}_${index + 1}`, batch.map((r: any) => ({ id: r.id, locale: r.locale, text: r.text })));
    await writeFile(file, `${JSON.stringify({ schemaVersion: "v052-existing-routes-1", mode, index, expected: batch, ...result }, null, 2)}\n`);
    complete++;
    process.stdout.write(`${mode} ${complete}/${batches.length} latency=${result.latencyMs}ms\n`);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
process.stdout.write(`V052_EXISTING_${mode.toUpperCase()}_COMPLETE ${rows.length}\n`);
