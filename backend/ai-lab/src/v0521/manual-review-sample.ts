import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { V0521Dataset, V0521DatasetCase } from "./dataset-contracts.js";

const dataset = JSON.parse(await readFile(resolve("results/v0521/blind-dataset.json"), "utf8")) as V0521Dataset;
const hash = (value: string) => createHash("sha256").update(`v0521-manual:${value}`).digest("hex");
const selected: V0521DatasetCase[] = [];
const selectedIds = new Set<string>();
const buckets = new Map<string, V0521DatasetCase[]>();
for (const row of dataset.cases) {
  const key = `${row.cohort}:${row.locale}`;
  const values = buckets.get(key) ?? [];
  values.push(row);
  buckets.set(key, values);
}
for (const [, rows] of [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const picked = rows.sort((a, b) => hash(a.id).localeCompare(hash(b.id))).slice(0, 28);
  for (const row of picked) { selected.push(row); selectedIds.add(row.id); }
}
const extras = dataset.cases
  .filter((row) => !selectedIds.has(row.id))
  .sort((a, b) => hash(`extra:${a.id}`).localeCompare(hash(`extra:${b.id}`)))
  .slice(0, 400 - selected.length);
selected.push(...extras);
if (selected.length !== 400) throw new Error(`EXPECTED_400_MANUAL_REVIEW_CASES_GOT_${selected.length}`);

const payload = {
  schemaVersion: "v0521-manual-review-sample-1",
  createdAt: new Date().toISOString(),
  sampleSize: selected.length,
  balance: Object.fromEntries(
    [...buckets.keys()].sort().map((key) => [key, selected.filter((row) => `${row.cohort}:${row.locale}` === key).length]),
  ),
  reviewInstructions: {
    labelDrift: "Mark only when the generated utterance does not express its labels. Do not relabel merely to agree with Router output.",
    claim: "Confirm whether a factual/probable world claim is actually asserted and whether its span is exact.",
    ambiguity: "Confirm that at least two materially different readings remain plausible and would change policy behavior.",
    secondary: "Required secondaries must be independently realized; optional/forbidden labels must not be inferred from tone alone.",
  },
  rows: selected.map((row) => ({
    id: row.id,
    locale: row.locale,
    cohort: row.cohort,
    text: row.text,
    canonicalPrimaryIntent: row.canonicalPrimaryIntent,
    acceptablePrimaryIntents: row.acceptablePrimaryIntents,
    requiredSecondaryIntents: row.requiredSecondaryIntents,
    optionalSecondaryIntents: row.optionalSecondaryIntents,
    forbiddenSecondaryIntents: row.forbiddenSecondaryIntents,
    claimExpected: row.claimExpected,
    canonicalClaims: row.canonicalClaims,
    ambiguousExpected: row.ambiguousExpected,
    alternativeIntent: row.alternativeIntent,
    ambiguityType: row.ambiguityType,
  })),
};
await writeFile(resolve("results/v0521/manual-review-sample.json"), `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`V0521_MANUAL_REVIEW_SAMPLE ${selected.length}\n`);

