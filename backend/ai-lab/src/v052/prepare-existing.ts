import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FAMILY_BY_INTENT } from "./contracts.js";
import { OLD_TO_ROUTER } from "./taxonomy.js";

const waves = await Promise.all(
  ["wave1", "wave2"].map(async (wave) => ({
    wave,
    data: JSON.parse(await readFile(resolve(`results/v051/${wave}-dataset.json`), "utf8")),
  })),
);
const rows = waves.flatMap(({ wave, data }) =>
  data.utterances.map((row: any) => {
    const canonicalPrimaryIntent = OLD_TO_ROUTER[row.canonicalScenarioIntent] ?? "UNCLEAR";
    return {
      id: `${wave}_${row.id}`,
      sourceWave: wave,
      locale: row.locale,
      text: row.text,
      originalCanonicalIntent: row.canonicalScenarioIntent,
      canonicalPrimaryIntent,
      canonicalIntentFamily: FAMILY_BY_INTENT[canonicalPrimaryIntent],
      acceptablePrimaryIntents: [canonicalPrimaryIntent],
      acceptablePlanIds: row.acceptablePlanIds,
      expectedClaimType:
        row.canonicalScenarioIntent === "FALSE_DEADLINE_CLAIM"
          ? "DEADLINE_CHANGED"
          : row.canonicalScenarioIntent === "FALSE_HISTORY_CLAIM"
            ? "PRIOR_PROMISE"
            : row.canonicalScenarioIntent === "UNKNOWN_PERSONAL_CLAIM"
              ? "PERSONAL_OR_EMPLOYMENT"
              : null,
      order: createHash("sha256").update(`${wave}|${row.id}`).digest("hex"),
    };
  }),
).sort((a: any, b: any) => a.order.localeCompare(b.order));
const development = rows.slice(0, 5000), validation = rows.slice(5000);
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const payload = {
  schemaVersion: "v052-existing-split-1",
  sourceHashes: waves.map((x) => ({ wave: x.wave, hash: x.data.datasetHash })),
  development: { size: development.length, hash: hash(development), rows: development },
  validation: { size: validation.length, hash: hash(validation), rows: validation },
};
await mkdir(resolve("results/v052"), { recursive: true });
await writeFile(resolve("results/v052/existing-split.json"), `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ development: payload.development.size, validation: payload.validation.size, developmentHash: payload.development.hash, validationHash: payload.validation.hash }, null, 2)}\n`);
