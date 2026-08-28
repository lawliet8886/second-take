import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const manifest = JSON.parse(await readFile(resolve("results/v052/router-freeze.json"), "utf8"));
for (const file of manifest.files) if (sha(await readFile(resolve(file.path))) !== file.sha256) throw new Error(`V052_ROUTER_FREEZE_CHANGED:${file.path}`);
process.stdout.write(`V052_ROUTER_FREEZE_OK ${manifest.aggregateHash}\n`);
