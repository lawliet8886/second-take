import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FAMILY_BY_INTENT } from "./contracts.js";
import type { V0521Dataset, V0521DatasetCase } from "./dataset-contracts.js";

const directory = resolve("results/v0521/blind-generation-batches");
const generationPlan = await readFile(resolve("results/v0521/blind-generation-plan.json"));
const generationPlanHash = createHash("sha256").update(generationPlan).digest("hex");
const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();
const cases: V0521DatasetCase[] = [];
for (const file of files) {
  const batch = JSON.parse(await readFile(resolve(directory, file), "utf8"));
  if (batch.generationPlanHash !== generationPlanHash) throw new Error(`V0521_GENERATION_PLAN_HASH_MISMATCH:${file}`);
  for (const utterance of batch.utterances) {
    const label = batch.labels;
    cases.push({
      id: utterance.id,
      groupId: utterance.groupId,
      locale: batch.locale,
      text: utterance.text,
      cohort: batch.cohort,
      canonicalPrimaryIntent: label.primaryIntent,
      acceptablePrimaryIntents: label.acceptablePrimaryIntents,
      canonicalIntentFamily: FAMILY_BY_INTENT[label.primaryIntent as keyof typeof FAMILY_BY_INTENT],
      requiredSecondaryIntents: label.requiredSecondaryIntents,
      optionalSecondaryIntents: label.optionalSecondaryIntents,
      forbiddenSecondaryIntents: label.forbiddenSecondaryIntents,
      canonicalClaims: label.claimType
        ? [{ claimType: label.claimType, sourceSpan: utterance.claimSourceSpan, epistemicStrength: label.epistemicStrength }]
        : [],
      claimExpected: Boolean(label.claimType),
      ambiguousExpected: batch.cohort === "GENUINE_AMBIGUOUS",
      alternativeIntent: label.alternativeIntent,
      ambiguityType: label.ambiguityType,
      metaAttackExpected: batch.cohort === "META_ATTACK",
      outOfScopeExpected: batch.cohort === "OUT_OF_SCOPE",
      styleProfile: batch.styleProfile,
      difficultyProfile: batch.cohort === "CLEAR_SINGLE_INTENT" ? "EASY" : batch.cohort === "OUT_OF_SCOPE" ? "MEDIUM" : "HARD",
    });
  }
}
if (cases.length !== 3_500) throw new Error(`EXPECTED_3500_V0521_BLIND_CASES_GOT_${cases.length}`);
if (cases.filter((row) => row.locale === "pt-BR").length !== 1_750) throw new Error("EXPECTED_1750_PT_BR");
if (cases.filter((row) => row.locale === "en-US").length !== 1_750) throw new Error("EXPECTED_1750_EN_US");
if (new Set(cases.map((row) => row.id)).size !== cases.length) throw new Error("DUPLICATE_V0521_CASE_ID");

const dataset: V0521Dataset = { schemaVersion: "v0521-dataset-1", createdAt: new Date().toISOString(), cases };
const body = `${JSON.stringify(dataset, null, 2)}\n`;
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const duplicateTexts = cases.length - new Set(cases.map((row) => `${row.locale}:${row.text.toLocaleLowerCase(row.locale)}`)).size;
const manifest = {
  schemaVersion: "v0521-blind-freeze-1",
  frozenAt: new Date().toISOString(),
  datasetHash: sha(body),
  generationPlanHash,
  size: cases.length,
  ptBR: cases.filter((row) => row.locale === "pt-BR").length,
  enUS: cases.filter((row) => row.locale === "en-US").length,
  paraphraseGroups: new Set(cases.map((row) => row.groupId)).size,
  duplicateTexts,
  byCohort: Object.fromEntries(
    [...new Set(cases.map((row) => row.cohort))].sort().map((cohort) => [cohort, cases.filter((row) => row.cohort === cohort).length]),
  ),
  rates: {
    ambiguous: cases.filter((row) => row.ambiguousExpected).length / cases.length,
    multiIntent: cases.filter((row) => row.requiredSecondaryIntents.length > 0).length / cases.length,
    claimPresent: cases.filter((row) => row.claimExpected).length / cases.length,
    noClaimLookalike: cases.filter((row) => row.cohort === "NO_CLAIM_LOOKALIKE").length / cases.length,
    metaAttack: cases.filter((row) => row.metaAttackExpected).length / cases.length,
    outOfScope: cases.filter((row) => row.outOfScopeExpected).length / cases.length,
  },
};
await writeFile(resolve("results/v0521/blind-dataset.json"), body);
await writeFile(resolve("results/v0521/blind-freeze.json"), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
