import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { RESPONSE_PLANS } from "../v05/catalog.js";
import { hashV055Files } from "../v055/fingerprint.js";

export const V056_FOUNDATION_FILES = [
  "results/v0282/validator-freeze.json",
  "results/v051/final-policy-freeze.json",
  "results/v05/graph-freeze.json",
  "results/v052/router-freeze.json",
  "results/v0521/router-freeze.json",
  "results/v055/intent-lock-freeze.json",
  "src/v052/policy.ts",
  "src/v055/contracts.ts",
  "src/v055/options.ts",
  "src/v055/policy.ts",
  "src/v055/runtime.ts",
] as const;

export async function hashFiles(files: readonly string[]) {
  const hash = createHash("sha256");
  for (const file of files) { hash.update(file); hash.update("\0"); hash.update(await readFile(resolve(file))); hash.update("\0"); }
  return hash.digest("hex");
}

export async function captureFoundation() {
  return {
    combinedHash: await hashFiles(V056_FOUNDATION_FILES),
    intentLockHash: await hashV055Files(),
    responsePlanCount: RESPONSE_PLANS.length,
    files: V056_FOUNDATION_FILES,
  };
}
