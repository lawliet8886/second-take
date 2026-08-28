import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const sha256 = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

type FileFingerprint = { path: string; sha256: string };
const manifest = JSON.parse(
  await readFile(resolve("results/v0521/router-freeze.json"), "utf8"),
) as {
  aggregateHash: string;
  files: FileFingerprint[];
};

for (const file of manifest.files) {
  const actual = sha256(await readFile(resolve(file.path)));
  if (actual !== file.sha256) {
    throw new Error(
      `V0521_ROUTER_FREEZE_CHANGED:${file.path}:expected=${file.sha256}:actual=${actual}`,
    );
  }
}

const aggregate = sha256(
  manifest.files.map((file) => `${file.path}:${file.sha256}`).join("\n"),
);
if (aggregate !== manifest.aggregateHash) {
  throw new Error(
    `V0521_ROUTER_AGGREGATE_CHANGED:expected=${manifest.aggregateHash}:actual=${aggregate}`,
  );
}

process.stdout.write(`V0521_ROUTER_FREEZE_OK ${aggregate}\n`);
