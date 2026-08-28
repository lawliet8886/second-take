import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const sha256 = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

const EXPECTED = Object.freeze({
  parserV0282: "177ba8dabf14daf4eed1f7341878f61255a7add5de05774376d919355dc32d75",
  policyV051: "ea950e2b8198392ac8c2c7f8e1124ca266e686130cc3bb9825cab07b3fd7489b",
  graphV05: "8b784ac33b1a8cc15cfc220c47275f08eceeecaf6ba2f921c39c988e6c5d89fa",
  routerV052: "e57f07177685846d8c9e3dfd6b5e417a139e0a1de124ea343ec15bfcaaaa79b8",
});

type FileFingerprint = { path: string; sha256: string };

async function json(path: string): Promise<any> {
  return JSON.parse(await readFile(resolve(path), "utf8"));
}

async function verifyPerFileManifest(
  manifestPath: string,
  aggregateField: string,
  expectedAggregate: string,
): Promise<void> {
  const manifest = await json(manifestPath);
  if (manifest[aggregateField] !== expectedAggregate) {
    throw new Error(
      `FOUNDATION_MANIFEST_HASH_CHANGED:${manifestPath}:expected=${expectedAggregate}:actual=${String(manifest[aggregateField])}`,
    );
  }
  for (const file of manifest.files as FileFingerprint[]) {
    const actual = sha256(await readFile(resolve(file.path)));
    if (actual !== file.sha256) {
      throw new Error(
        `FOUNDATION_FILE_CHANGED:${file.path}:expected=${file.sha256}:actual=${actual}`,
      );
    }
  }
  const aggregate = sha256(
    (manifest.files as FileFingerprint[])
      .map((file) => `${file.path}:${file.sha256}`)
      .join("\n"),
  );
  if (aggregate !== expectedAggregate) {
    throw new Error(
      `FOUNDATION_AGGREGATE_MISMATCH:${manifestPath}:expected=${expectedAggregate}:actual=${aggregate}`,
    );
  }
}

async function verifyCriticalFilesManifest(
  manifestPath: string,
  hashField: string,
  expectedHash: string,
  normalizePaths: boolean,
): Promise<any> {
  const manifest = await json(manifestPath);
  if (manifest[hashField] !== expectedHash) {
    throw new Error(
      `FOUNDATION_MANIFEST_HASH_CHANGED:${manifestPath}:expected=${expectedHash}:actual=${String(manifest[hashField])}`,
    );
  }
  const hash = createHash("sha256");
  for (const rawPath of manifest.criticalFiles as string[]) {
    const path = normalizePaths ? rawPath.replaceAll("\\", "/") : rawPath;
    hash.update(path);
    hash.update("\0");
    hash.update(await readFile(resolve(rawPath)));
    hash.update("\0");
  }
  const actual = hash.digest("hex");
  if (actual !== expectedHash) {
    throw new Error(
      `FOUNDATION_FILES_HASH_CHANGED:${manifestPath}:expected=${expectedHash}:actual=${actual}`,
    );
  }
  return manifest;
}

await verifyPerFileManifest(
  "results/v0282/validator-freeze.json",
  "aggregateSha256",
  EXPECTED.parserV0282,
);
const policy = await verifyCriticalFilesManifest(
  "results/v051/final-policy-freeze.json",
  "policyHash",
  EXPECTED.policyV051,
  false,
);
const graph = await verifyCriticalFilesManifest(
  "results/v05/graph-freeze.json",
  "graphHash",
  EXPECTED.graphV05,
  true,
);
await verifyPerFileManifest(
  "results/v052/router-freeze.json",
  "aggregateHash",
  EXPECTED.routerV052,
);

if (policy.counts?.responsePlans !== 25 || graph.counts?.responsePlans !== 25) {
  throw new Error("FOUNDATION_RESPONSE_PLAN_COUNT_CHANGED");
}

process.stdout.write(
  `${JSON.stringify({ status: "PASS", hashes: EXPECTED, responsePlans: 25 })}\n`,
);
