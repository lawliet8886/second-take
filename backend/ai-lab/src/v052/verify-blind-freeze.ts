import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const freeze=JSON.parse(await readFile(resolve("results/v052/blind-freeze.json"),"utf8")),body=await readFile(resolve("results/v052/blind-dataset.json"));
const actual=createHash("sha256").update(body).digest("hex");if(actual!==freeze.datasetHash)throw new Error(`V052_BLIND_DATASET_CHANGED expected=${freeze.datasetHash} actual=${actual}`);process.stdout.write(`V052_BLIND_FREEZE_OK ${actual}\n`);
