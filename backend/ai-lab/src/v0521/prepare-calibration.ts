import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { BlindCase } from "../v052/contracts.js";
import { FAMILY_BY_INTENT, PRIMARY_INTENTS, type RouterIntent } from "./contracts.js";
import type { V0521Dataset, V0521DatasetCase } from "./dataset-contracts.js";

const source = JSON.parse(await readFile(resolve("results/v052/blind-dataset.json"), "utf8")) as {
  cases: BlindCase[];
};
const sourceFreeze = JSON.parse(await readFile(resolve("results/v052/blind-freeze.json"), "utf8")) as {
  datasetHash: string;
};
const hash = (value: string) => createHash("sha256").update(`v0521-calibration:${value}`).digest("hex");

const quotas: Partial<Record<RouterIntent, number>> = {
  AMBIGUOUS: 300,
  ASK_CAPABILITY: 160,
  REQUEST_COMPLETION: 160,
  EXPRESS_FRUSTRATION: 160,
  ACCUSE_GENERALIZATION: 160,
  PROPOSE_COLLABORATION: 160,
  ASSERT_CLAIM: 200,
  APOLOGIZE: 80,
  ASK_STATUS: 60,
  CHANGE_TOPIC: 60,
};

const selected: BlindCase[] = [];
for (const [intent, total] of Object.entries(quotas) as Array<[RouterIntent, number]>) {
  for (const locale of ["pt-BR", "en-US"] as const) {
    const rows = source.cases
      .filter((row) => row.canonicalPrimaryIntent === intent && row.locale === locale)
      .sort((a, b) => hash(a.id).localeCompare(hash(b.id)))
      .slice(0, total / 2);
    if (rows.length !== total / 2) throw new Error(`CALIBRATION_BUCKET_SHORT:${intent}:${locale}:${rows.length}`);
    selected.push(...rows);
  }
}
if (selected.length !== 1_500) throw new Error(`EXPECTED_1500_CALIBRATION_CASES_GOT_${selected.length}`);

const cases: V0521DatasetCase[] = selected
  .sort((a, b) => hash(`order:${a.id}`).localeCompare(hash(`order:${b.id}`)))
  .map((row) => {
    const calibrationPrimary = row.intentionallyAmbiguous ? "ASK_CAPABILITY" : row.canonicalPrimaryIntent;
    const acceptablePrimaryIntents = row.intentionallyAmbiguous
      ? (["ASK_CAPABILITY", "REQUEST_COMPLETION"] as RouterIntent[])
      : [calibrationPrimary];
    const required = [...row.coreSecondaryIntents];
    const forbidden = PRIMARY_INTENTS.filter(
      (intent) => intent !== calibrationPrimary && !acceptablePrimaryIntents.includes(intent) && !required.includes(intent),
    );
    return {
      id: `cal_${row.id}`,
      groupId: `cal_${row.groupId}`,
      locale: row.locale,
      text: row.text,
      cohort: (row.intentionallyAmbiguous
        ? "GENUINE_AMBIGUOUS"
        : required.length
            ? "MULTI_INTENT"
            : row.canonicalClaims.length
              ? "CLAIM_PRESENT"
            : "CLEAR_SINGLE_INTENT") as V0521DatasetCase["cohort"],
      canonicalPrimaryIntent: calibrationPrimary,
      acceptablePrimaryIntents,
      canonicalIntentFamily: FAMILY_BY_INTENT[calibrationPrimary],
      requiredSecondaryIntents: required,
      optionalSecondaryIntents: [],
      forbiddenSecondaryIntents: forbidden,
      canonicalClaims: row.canonicalClaims.map((claim) => ({ ...claim, epistemicStrength: "ASSERTED" as const })),
      claimExpected: row.canonicalClaims.length > 0,
      ambiguousExpected: row.intentionallyAmbiguous,
      alternativeIntent: row.intentionallyAmbiguous ? ("REQUEST_COMPLETION" as RouterIntent) : null,
      ambiguityType: (row.intentionallyAmbiguous ? "REQUEST_VS_CAPABILITY" : "NONE") as V0521DatasetCase["ambiguityType"],
      metaAttackExpected: row.canonicalPrimaryIntent === "META_PROMPT_ATTACK",
      outOfScopeExpected: row.outOfScope,
      styleProfile: row.styleProfile,
      difficultyProfile: row.difficultyProfile,
    };
  })
  .slice(0, 1_200);

const dataset: V0521Dataset = { schemaVersion: "v0521-dataset-1", createdAt: new Date().toISOString(), cases };
const body = `${JSON.stringify(dataset, null, 2)}\n`;
const manifest = {
  schemaVersion: "v0521-calibration-freeze-1",
  createdAt: new Date().toISOString(),
  sourceDatasetHash: sourceFreeze.datasetHash,
  datasetHash: createHash("sha256").update(body).digest("hex"),
  size: cases.length,
  ptBR: cases.filter((row) => row.locale === "pt-BR").length,
  enUS: cases.filter((row) => row.locale === "en-US").length,
  byCohort: Object.fromEntries(
    ["CLEAR_SINGLE_INTENT", "GENUINE_AMBIGUOUS", "MULTI_INTENT", "CLAIM_PRESENT"].map((cohort) => [
      cohort,
      cases.filter((row) => row.cohort === cohort).length,
    ]),
  ),
};
await mkdir(resolve("results/v0521"), { recursive: true });
await writeFile(resolve("results/v0521/calibration-dataset.json"), body);
await writeFile(resolve("results/v0521/calibration-freeze.json"), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
