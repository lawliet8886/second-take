import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { initialState } from "../v05/policy.js";
import { FAMILY_BY_INTENT } from "./contracts.js";
import type { RouterIntent } from "./contracts.js";
import { candidatePlansFromRouting } from "./policy.js";

const mode = process.argv[2] as "pilot" | "development" | "validation";
const dir = resolve(`results/v052/existing-${mode}-batches`);
const files = (await readdir(dir)).filter((x) => x.endsWith(".json")).sort();
const rows: any[] = [];
for (const file of files) {
  const batch = JSON.parse(await readFile(resolve(dir, file), "utf8"));
  for (const route of batch.routes) {
    const expected = batch.expected.find((x: any) => x.id === route.id);
    const plans = candidatePlansFromRouting(initialState(), route.locale, route.text, route.envelope);
    const candidatePlanIds = plans.map((p) => p.id);
    const exact = expected.acceptablePrimaryIntents.includes(route.envelope.primaryIntent);
    const family = FAMILY_BY_INTENT[route.envelope.primaryIntent as RouterIntent] === expected.canonicalIntentFamily;
    const covered = expected.acceptablePlanIds.some((id: string) => candidatePlanIds.includes(id));
    const claimDetected = expected.expectedClaimType
      ? route.envelope.userClaimCandidates.some((c: any) =>
          expected.expectedClaimType === "PERSONAL_OR_EMPLOYMENT"
            ? ["PERSONAL_HEALTH", "PERSONAL_EMPLOYMENT", "OTHER_USER_CLAIM"].includes(c.claimType)
            : c.claimType === expected.expectedClaimType,
        )
      : null;
    rows.push({ ...expected, predicted: route.envelope, exact, family, covered, candidatePlanIds, claimDetected });
  }
}
const rate = (fn: (r: any) => boolean, subset = rows) => subset.length ? subset.filter(fn).length / subset.length : 1;
const claims = rows.filter((r) => r.expectedClaimType);
const payload = {
  schemaVersion: "v052-existing-evaluation-1",
  mode,
  summary: {
    total: rows.length,
    exactIntentAccuracy: rate((r) => r.exact),
    intentFamilyAccuracy: rate((r) => r.family),
    candidateCoverage: rate((r) => r.covered),
    claimDetectionAccuracy: rate((r) => r.claimDetected, claims),
    metaAttackAccuracy: rate((r) => r.predicted.metaAttack === (r.canonicalPrimaryIntent === "META_PROMPT_ATTACK")),
    ptBR: { total: rows.filter((r) => r.locale === "pt-BR").length, exact: rate((r) => r.exact, rows.filter((r) => r.locale === "pt-BR")), family: rate((r) => r.family, rows.filter((r) => r.locale === "pt-BR")), coverage: rate((r) => r.covered, rows.filter((r) => r.locale === "pt-BR")) },
    enUS: { total: rows.filter((r) => r.locale === "en-US").length, exact: rate((r) => r.exact, rows.filter((r) => r.locale === "en-US")), family: rate((r) => r.family, rows.filter((r) => r.locale === "en-US")), coverage: rate((r) => r.covered, rows.filter((r) => r.locale === "en-US")) },
  },
  confusions: Object.entries(rows.filter((r) => !r.exact).reduce((a: any, r: any) => { const key = `${r.canonicalPrimaryIntent}->${r.predicted.primaryIntent}`; a[key] = (a[key] ?? 0) + 1; return a; }, {})).sort((a: any,b: any)=>b[1]-a[1]).slice(0,30).map(([pair,count])=>({pair,count})),
  rows,
};
await writeFile(resolve(`results/v052/existing-${mode}-results.json`), `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ mode, summary: payload.summary, confusions: payload.confusions.slice(0, 10) }, null, 2)}\n`);
