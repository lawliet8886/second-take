import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { evaluateArtifacts, optionalLabelDriftIds, type RouteArtifactV0521 } from "./evaluation-core.js";

const mode = process.argv[2] as "calibration" | "blind";
if (!(["calibration", "blind"] as const).includes(mode)) throw new Error("USAGE: evaluate-dataset.ts calibration|blind");
const directory = resolve(`results/v0521/${mode}-router-batches`);
const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();
const artifacts = await Promise.all(files.map(async (file) => JSON.parse(await readFile(resolve(directory, file), "utf8")) as RouteArtifactV0521));
const payload = { schemaVersion: `v0521-${mode}-results-1`, generatedAt: new Date().toISOString(), ...evaluateArtifacts(artifacts, await optionalLabelDriftIds(mode)) };
await writeFile(resolve(`results/v0521/${mode}-results.json`), `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(payload.summary, null, 2)}\n`);
