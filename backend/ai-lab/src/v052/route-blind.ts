import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { V052ApiClient } from "./api-client.js";
import { routeBatch } from "./router.js";
const key = process.env.GEMINI_API_KEY?.trim(), model = process.env.GEMINI_MODEL?.trim() || "gemini-3.7-flash";
if (!key || key === "COLE_SUA_CHAVE_AQUI") throw new Error("Configure GEMINI_API_KEY only in ai-lab/.env");
const freeze = JSON.parse(await readFile(resolve("results/v052/blind-freeze.json"), "utf8"));
const dataset = JSON.parse(await readFile(resolve("results/v052/blind-dataset.json"), "utf8"));
const batches = Array.from({ length: Math.ceil(dataset.cases.length / 5) }, (_, i) => dataset.cases.slice(i * 5, i * 5 + 5));
const outDir = resolve("results/v052/blind-router-batches"); await mkdir(outDir, { recursive: true });
const client = new V052ApiClient(key, model); let cursor = 0, complete = 0;
async function worker() { for (;;) { const index = cursor++; if (index >= batches.length) return; const file = resolve(outDir, `${String(index + 1).padStart(4, "0")}.json`); try { await readFile(file); complete++; continue; } catch {} const batch = batches[index]!; const result = await routeBatch(client, "router_blind", `blind_route_${index + 1}`, batch.map((x: any) => ({ id: x.id, locale: x.locale, text: x.text }))); await writeFile(file, `${JSON.stringify({ schemaVersion: "v052-blind-routes-1", index, datasetHash: freeze.datasetHash, expected: batch, ...result }, null, 2)}\n`); complete++; if (complete % 20 === 0) process.stdout.write(`blind-route ${complete}/${batches.length}\n`); } }
await Promise.all(Array.from({ length: 6 }, worker)); process.stdout.write(`V052_BLIND_ROUTING_COMPLETE cases=${dataset.cases.length} batches=${batches.length}\n`);
