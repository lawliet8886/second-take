import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const challengePath = resolve("results/v0531/challenge.json");
const challenge = JSON.parse(await readFile(challengePath, "utf8"));
const reviewed = (challenge.cases as any[]).filter((row) => row.batchId.endsWith("_01"));
if (reviewed.length !== 300) throw new Error(`MANUAL_REVIEW_SAMPLE:${reviewed.length}`);
const validNumbers: Record<string, Set<number>> = {
  "FRUSTRATION_ACCUSATION|en-US": new Set([4,5,7,9,11,14,17,19,20,22,24]),
  "FRUSTRATION_ACCUSATION|pt-BR": new Set([1,2,3,4,5,7,8,9,11,12,13,15,16,17,18,19,20,22,24,25]),
  "MULTI_ACT_SCOPE|en-US": new Set([3,4,9,11,15,16,20,21,24]),
  "MULTI_ACT_SCOPE|pt-BR": new Set([2,5,8,9,12,13,15,19,20,23]),
  "OFFER_COLLABORATION|en-US": new Set([1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,18,19,20,23,24]),
  "OFFER_COLLABORATION|pt-BR": new Set([3,6,8,10,14,15,19,24]),
};
const decisions = reviewed.map((row) => {
  const number = Number(row.id.match(/_U(\d+)$/)?.[1]);
  const key = `${row.cohort}|${row.locale}`;
  const valid = row.cohort === "CLEAR_FAMILY_CONTROL" || row.cohort === "OTHER_CLEAR_CONTROL" || row.cohort === "REQUEST_CAPABILITY" || validNumbers[key]?.has(number) === true;
  return { id: row.id, locale: row.locale, cohort: row.cohort, decision: valid ? "LABEL_OK" : "LABEL_DRIFT", note: valid ? "Surface preserves the predeclared contrast/control." : "Surface resolves or fails to realize one material reading fixed before generation." };
});
const drift = new Set(decisions.filter((row) => row.decision === "LABEL_DRIFT").map((row) => row.id));
for (const row of challenge.cases) if (drift.has(row.id)) row.labelDrift = true;
const body = `${JSON.stringify(challenge, null, 2)}\n`;
const hash = createHash("sha256").update(body).digest("hex");
await writeFile(challengePath, body);
await writeFile(resolve("results/v0531/manual-review.json"), `${JSON.stringify({ schemaVersion: "v0531-manual-review-1", reviewed: decisions.length, drift: drift.size, driftRate: drift.size / decisions.length, decisions }, null, 2)}\n`);
const oldFreeze = JSON.parse(await readFile(resolve("results/v0531/challenge-freeze.json"), "utf8"));
await writeFile(resolve("results/v0531/challenge-freeze.json"), `${JSON.stringify({ ...oldFreeze, hash, frozenAfterManualReviewAt: new Date().toISOString(), manualReviewCases: decisions.length, manualLabelDrift: drift.size, manualLabelDriftRate: drift.size / decisions.length }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ reviewed: decisions.length, drift: drift.size, driftRate: drift.size / decisions.length, hash }, null, 2)}\n`);
