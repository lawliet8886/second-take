import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const freeze = JSON.parse(await readFile(resolve("results/v0521/blind-freeze.json"), "utf8"));
const dataset = await readFile(resolve("results/v0521/blind-dataset.json"));
const actual = createHash("sha256").update(dataset).digest("hex");
if (actual !== freeze.datasetHash)
  throw new Error(`V0521_BLIND_DATASET_CHANGED expected=${freeze.datasetHash} actual=${actual}`);
const parsed = JSON.parse(dataset.toString("utf8"));
if (parsed.cases?.length !== freeze.size || freeze.size !== 3_500)
  throw new Error("V0521_BLIND_DATASET_SIZE_CHANGED");
process.stdout.write(`V0521_BLIND_FREEZE_OK ${actual}\n`);
