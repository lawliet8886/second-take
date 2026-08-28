import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sha256 = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

const authorizedFiles = [
  "src/v0521/contracts.ts",
  "src/v0521/taxonomy.ts",
  "src/v0521/schema.ts",
  "src/v0521/prompt.ts",
  "src/v0521/validator.ts",
  "src/v0521/router.ts",
] as const;

const files = await Promise.all(
  authorizedFiles.map(async (path) => ({
    path,
    sha256: sha256(await readFile(resolve(path))),
  })),
);

const byPath = new Map(files.map((file) => [file.path, file.sha256]));
const manifest = {
  schemaVersion: "v0521-router-freeze-1",
  frozenAt: new Date().toISOString(),
  promptHash: byPath.get("src/v0521/prompt.ts"),
  schemaHash: byPath.get("src/v0521/schema.ts"),
  taxonomyHash: byPath.get("src/v0521/taxonomy.ts"),
  contractsHash: byPath.get("src/v0521/contracts.ts"),
  aggregateHash: sha256(
    files.map((file) => `${file.path}:${file.sha256}`).join("\n"),
  ),
  files,
  foundation: {
    parserV0282: "177ba8dabf14daf4eed1f7341878f61255a7add5de05774376d919355dc32d75",
    policyV051: "ea950e2b8198392ac8c2c7f8e1124ca266e686130cc3bb9825cab07b3fd7489b",
    graphV05: "8b784ac33b1a8cc15cfc220c47275f08eceeecaf6ba2f921c39c988e6c5d89fa",
    routerV052: "e57f07177685846d8c9e3dfd6b5e417a139e0a1de124ea343ec15bfcaaaa79b8",
  },
  instruction:
    "Frozen after v0.5.2.1 calibration. Do not alter these routing semantics during blind, stability, or runtime evaluation.",
};

await mkdir(resolve("results/v0521"), { recursive: true });
await writeFile(
  resolve("results/v0521/router-freeze.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { flag: "wx" },
);
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
