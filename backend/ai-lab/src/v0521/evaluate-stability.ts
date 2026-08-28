import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FAMILY_BY_INTENT, type RouterIntent } from "./contracts.js";

const directory = resolve("results/v0521/stability-batches");
const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();
const groups = new Map<string, { expected: any; runs: any[] }>();
for (const file of files) {
  const artifact = JSON.parse(await readFile(resolve(directory, file), "utf8"));
  for (const expected of artifact.expected ?? []) {
    const group = groups.get(expected.id) ?? { expected, runs: [] };
    const route = artifact.routes?.find((candidate: any) => candidate.id === `${expected.id}__R${artifact.repeat}`);
    group.runs.push(route?.envelope ?? null);
    groups.set(expected.id, group);
  }
}
const rows = [...groups].map(([id, group]) => {
  const intents = group.runs.map((run) => run?.primaryIntent ?? null);
  const families = intents.map((intent) => intent ? FAMILY_BY_INTENT[intent as RouterIntent] : null);
  const acceptable = intents.every((intent) => intent && group.expected.acceptablePrimaryIntents.includes(intent));
  const ambiguityStable = group.expected.ambiguousExpected
    ? group.runs.every((run) => run?.ambiguous === true)
    : true;
  return { id, intents, families, acceptable, familyStable: new Set(families).size === 1, exactStable: new Set(intents).size === 1, ambiguityStable, complete: group.runs.length === 3 && group.runs.every(Boolean) };
});
const ratio = (key: keyof (typeof rows)[number]) => rows.filter((row) => row[key] === true).length / Math.max(1, rows.length);
const ambiguous = rows.filter((row) => groups.get(row.id)!.expected.ambiguousExpected);
const payload = {
  schemaVersion: "v0521-stability-results-1",
  sampleSize: rows.length,
  runsPerInput: 3,
  completeRate: ratio("complete"),
  withinAcceptableSetRate: ratio("acceptable"),
  familyStabilityRate: ratio("familyStable"),
  exactStabilityRate: ratio("exactStable"),
  ambiguityStabilityRate: ambiguous.filter((row) => row.ambiguityStable).length / Math.max(1, ambiguous.length),
  failures: rows.filter((row) => !row.acceptable || !row.ambiguityStable || !row.complete),
};
await writeFile(resolve("results/v0521/stability-results.json"), `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
