import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const files = [
  "src/v0531/contracts.ts",
  "src/v0531/gate.ts",
  "src/v0531/materiality.ts",
  "src/v0531/probe.ts",
  "src/v0531/prompt.ts",
  "src/v0531/schema.ts",
  "src/v0531/trigger.ts",
];
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const hashes = Object.fromEntries(await Promise.all(files.map(async (file) => [file, sha(await readFile(resolve(file), "utf8"))])));
const aggregateHash = sha(JSON.stringify(hashes));
const artifact = { schemaVersion: "v0531-freeze-1", frozenAt: new Date().toISOString(), files: hashes, aggregateHash };
await mkdir(resolve("results/v0531"), { recursive: true });
await writeFile(resolve("results/v0531/freeze.json"), `${JSON.stringify(artifact, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
