import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { initialState } from "../v05/policy.js";
import { ClarificationGate } from "../v053/gate.js";
import type { ClarificationGateInput } from "../v053/contracts.js";
import { ContrastiveClarificationGate } from "./gate.js";
import { planContrastiveProbe } from "./trigger.js";

const source = JSON.parse(await readFile(resolve("results/v053/challenge-results.json"), "utf8"));
const baseGate = new ClarificationGate();
const gate = new ContrastiveClarificationGate();
const ratio = (n: number, d: number) => d ? n / d : 0;

const positiveClass = (row: any, ambiguityClass: string) => {
  if (row.expected.expectedDisposition !== "NEEDS_CLARIFICATION") return false;
  if (ambiguityClass === "REQUEST_VS_CAPABILITY") return row.expected.ambiguityType === "REQUEST_VS_CAPABILITY";
  if (ambiguityClass.startsWith("FRUSTRATION_VS_ACCUSATION")) return row.expected.ambiguityType === "FRUSTRATION_VS_ACCUSATION";
  if (ambiguityClass === "OFFER_VS_COLLABORATION") return row.expected.ambiguityType === "OFFER_VS_COLLABORATION";
  return row.expected.cohort === "MULTI_INTENT";
};

const rows = (source.rows as any[]).filter((row) => row.route).map((row) => {
  const input: ClarificationGateInput = {
    id: row.id,
    locale: row.expected.locale,
    userText: row.expected.text,
    envelope: row.route.envelope,
    candidatePlanIds: row.decision?.disposition === "CLEAR" ? row.decision?.options?.flatMap((x: any) => x.candidatePlanIds) ?? [] : [],
    claimStatuses: row.route.envelope.userClaimCandidates.map((claim: any) => ({ ...claim, status: "UNKNOWN" })),
    currentState: initialState(),
  };
  // Reuse the original v0.5.3 decision so this analysis does not change its historical result.
  const base = row.decision ?? baseGate.decide(input);
  const trigger = planContrastiveProbe(input, base);
  if (!trigger.invoke) return { id: row.id, expected: row.expected, invoked: false, base, final: base, oraclePositive: false };
  const oraclePositive = positiveClass(row, trigger.ambiguityClass);
  const final = gate.decide({ ...input, baseDecision: base, probeTrigger: trigger, probeResult: { id: row.id, alternativeIsMateriallyPlausible: oraclePositive, ambiguityClass: trigger.ambiguityClass, confidence: "HIGH" } });
  return { id: row.id, expected: row.expected, invoked: true, trigger, base, final, oraclePositive };
});

const clear = rows.filter((row) => row.expected.expectedDisposition === "CLEAR");
const material = rows.filter((row) => row.expected.expectedDisposition === "NEEDS_CLARIFICATION" && row.expected.cohort !== "CLAIM_INPUT");
const normal = clear.filter((row) => row.expected.cohort === "CLEAR_CONTROL");
const difficult = rows.filter((row) => ["GENUINE_AMBIGUOUS", "MULTI_INTENT"].includes(row.expected.cohort));
const intercepted = material.filter((row) => row.final.disposition === "NEEDS_CLARIFICATION");
const summary = {
  schemaVersion: "v0531-retrospective-1",
  generatedAt: new Date().toISOString(),
  sourceCases: rows.length,
  probeInvocations: rows.filter((row) => row.invoked).length,
  probeInvocationRate: ratio(rows.filter((row) => row.invoked).length, rows.length),
  normalInvocationRate: ratio(normal.filter((row) => row.invoked).length, normal.length),
  hardInvocationRate: ratio(difficult.filter((row) => row.invoked).length, difficult.length),
  ambiguityCohortInvocationRate: ratio(material.filter((row) => row.invoked).length, material.length),
  clearCasesUntouched: clear.filter((row) => !row.invoked).length,
  clearCases: clear.length,
  theoreticalMaterialErrorInterception: ratio(intercepted.length, material.length),
  theoreticalClearFalseClarification: ratio(clear.filter((row) => row.final.disposition === "NEEDS_CLARIFICATION").length, clear.length),
  expectedExtraCallRate: ratio(rows.filter((row) => row.invoked).length, rows.length),
  byFamily: Object.fromEntries(["REQUEST_VS_CAPABILITY", "FRUSTRATION_VS_ACCUSATION", "OFFER_VS_COLLABORATION", "MULTI_INTENT"].map((family) => {
    const group = material.filter((row) => family === "MULTI_INTENT" ? row.expected.cohort === "MULTI_INTENT" : row.expected.ambiguityType === family);
    return [family, { cases: group.length, invoked: group.filter((row) => row.invoked).length, intercepted: group.filter((row) => row.final.disposition === "NEEDS_CLARIFICATION").length }];
  })),
};

await mkdir(resolve("results/v0531"), { recursive: true });
await writeFile(resolve("results/v0531/retrospective.json"), `${JSON.stringify({ summary, rows }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
