import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const artifact = JSON.parse(await readFile(resolve("results/v0531/freeze.json"), "utf8"));
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
for (const [file, expected] of Object.entries(artifact.files as Record<string, string>)) {
  const actual = sha(await readFile(resolve(file), "utf8"));
  if (actual !== expected) throw new Error(`V0531_FREEZE_MISMATCH:${file}:${expected}:${actual}`);
}
const aggregate = sha(JSON.stringify(artifact.files));
if (aggregate !== artifact.aggregateHash) throw new Error("V0531_AGGREGATE_MISMATCH");
process.stdout.write(`V0531_FREEZE_OK ${aggregate}\n`);
