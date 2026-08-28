import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FAMILY_BY_INTENT, PRIMARY_INTENTS } from "./contracts.js";
import { ROUTER_MODEL_CONFIG, ROUTER_SYSTEM_PROMPT } from "./prompt.js";

const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const files = ["src/v052/contracts.ts", "src/v052/taxonomy.ts", "src/v052/schema.ts", "src/v052/prompt.ts", "src/v052/validator.ts", "src/v052/router.ts", "src/v052/policy.ts"];
const fingerprints = await Promise.all(files.map(async (path) => ({ path, sha256: sha(await readFile(resolve(path))) })));
const manifest = {
  schemaVersion: "v052-router-freeze-1",
  frozenAt: new Date().toISOString(),
  model: ROUTER_MODEL_CONFIG.model,
  modelConfig: ROUTER_MODEL_CONFIG,
  promptHash: sha(ROUTER_SYSTEM_PROMPT),
  taxonomyHash: sha(JSON.stringify({ PRIMARY_INTENTS, FAMILY_BY_INTENT })),
  schemaHash: fingerprints.find((x) => x.path.endsWith("schema.ts"))!.sha256,
  aggregateHash: sha(fingerprints.map((x) => `${x.path}:${x.sha256}`).join("\n")),
  files: fingerprints,
  counts: { primaryIntents: PRIMARY_INTENTS.length, intentFamilies: new Set(Object.values(FAMILY_BY_INTENT)).size, calibrationCases: 500 },
  policyGraphHash: "ea950e2b8198392ac8c2c7f8e1124ca266e686130cc3bb9825cab07b3fd7489b",
  parserFreezeFingerprint: "177ba8dabf14daf4eed1f7341878f61255a7add5de05774376d919355dc32d75",
  instruction: "Do not alter router prompt, taxonomy, schema, policy, graph, or parser during blind evaluation.",
};
await mkdir(resolve("results/v052"), { recursive: true });
await writeFile(resolve("results/v052/router-freeze.json"), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
