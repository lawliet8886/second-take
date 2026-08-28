import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FAMILY_BY_INTENT, type BlindCase, type ClaimType } from "./contracts.js";
import { initialState } from "../v05/policy.js";
import { candidatePlansFromRouting } from "./policy.js";
import type { SemanticRoutingEnvelope } from "./contracts.js";
const dir = resolve("results/v052/blind-generation-batches"), files = (await readdir(dir)).filter((x) => x.endsWith(".json")).sort();
const cases: BlindCase[] = [];
for (const file of files) {
  const batch = JSON.parse(await readFile(resolve(dir, file), "utf8"));
  for (const row of batch.utterances) {
    const claims = batch.claimType ? [{ claimType: batch.claimType as ClaimType, sourceSpan: row.claimSourceSpan }] : [];
    cases.push({ id: row.id, groupId: row.groupId, locale: batch.locale, text: row.text, canonicalPrimaryIntent: batch.primaryIntent, acceptablePrimaryIntents: [batch.primaryIntent, ...batch.secondaryIntents], canonicalSecondaryIntents: batch.secondaryIntents, coreSecondaryIntents: batch.secondaryIntents, canonicalIntentFamily: FAMILY_BY_INTENT[batch.primaryIntent as keyof typeof FAMILY_BY_INTENT], canonicalClaims: claims, styleProfile: batch.styleProfile, difficultyProfile: batch.batch < 2 ? "HARD" : batch.batch < 5 ? "MEDIUM" : "EASY", adversarial: batch.primaryIntent === "META_PROMPT_ATTACK" || batch.primaryIntent === "ASSERT_CLAIM", intentionallyAmbiguous: batch.intentionallyAmbiguous, outOfScope: batch.outOfScope });
  }
}
if (cases.length !== 8000) throw new Error(`EXPECTED_8000_GOT_${cases.length}`);
const duplicateTexts = cases.length - new Set(cases.map((x) => `${x.locale}:${x.text.toLocaleLowerCase(x.locale)}`)).size;
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const body = JSON.stringify({ schemaVersion: "v052-blind-dataset-1", createdAt: new Date().toISOString(), cases }, null, 2) + "\n";
const payload = { datasetHash: sha(body), size: cases.length, ptBR: cases.filter((x) => x.locale === "pt-BR").length, enUS: cases.filter((x) => x.locale === "en-US").length, multiIntentRate: cases.filter((x) => x.coreSecondaryIntents.length).length / cases.length, claimRate: cases.filter((x) => x.canonicalClaims.length).length / cases.length, adversarialRate: cases.filter((x) => x.adversarial).length / cases.length, outOfScopeRate: cases.filter((x) => x.outOfScope).length / cases.length, ambiguousRate: cases.filter((x) => x.intentionallyAmbiguous).length / cases.length, paraphraseGroups: new Set(cases.map((x) => x.groupId)).size, duplicateTexts };
await writeFile(resolve("results/v052/blind-dataset.json"), body); await writeFile(resolve("results/v052/blind-freeze.json"), `${JSON.stringify(payload, null, 2)}\n`); process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
