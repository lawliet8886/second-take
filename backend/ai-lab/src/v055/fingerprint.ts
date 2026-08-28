import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const V055_FROZEN_FILES = [
  "src/v055/contracts.ts",
  "src/v055/options.ts",
  "src/v055/policy.ts",
  "src/v055/runtime.ts",
  "tests/v055-intent-lock.test.ts",
  "prototypes/v055-intent-lock/index.html",
] as const;

export async function hashV055Files(files: readonly string[] = V055_FROZEN_FILES) {
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file); hash.update("\0"); hash.update(await readFile(resolve(file))); hash.update("\0");
  }
  return hash.digest("hex");
}
