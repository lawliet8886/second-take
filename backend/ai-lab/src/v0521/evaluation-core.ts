import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { initialState, planPreconditions } from "../v05/policy.js";
import { SCENARIO_SPECS } from "../v051/scenario-specs.js";
import { candidatePlansFromRouting } from "../v052/policy.js";
import { FAMILY_BY_INTENT, type RouterIntent } from "./contracts.js";
import type { V0521DatasetCase } from "./dataset-contracts.js";
import { projectEnvelopeForFrozenPolicy, type RouterBatchResultV0521 } from "./router.js";

export type RouteArtifactV0521 = RouterBatchResultV0521 & {
  expected: V0521DatasetCase[];
  batchIndex?: number;
  failure?: string;
  fullLatencyMs?: number;
  localProcessingMs?: number;
};

const scenarioPlans = new Map(
  SCENARIO_SPECS.map((spec) => [spec.intent, spec.acceptablePlanIds]),
);

export const ratio = (numerator: number, denominator: number): number =>
  denominator ? numerator / denominator : 0;

export function stats(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const percentile = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * q) - 1)] ?? 0;
  return {
    count: sorted.length,
    p50: percentile(0.5),
    p95: percentile(0.95),
    max: sorted.at(-1) ?? 0,
    mean: sorted.reduce((sum, value) => sum + value, 0) / Math.max(1, sorted.length),
  };
}

export async function optionalLabelDriftIds(mode: "calibration" | "blind") {
  const candidates = [
    `results/v0521/${mode}-manual-review-results.json`,
    `results/v0521/${mode}-review.json`,
    `results/v0521/manual-review-results.json`,
  ];
  for (const path of candidates) {
    try {
      const value = JSON.parse(await readFile(resolve(path), "utf8"));
      return new Set<string>(value.labelDriftIds ?? []);
    } catch {}
  }
  return new Set<string>();
}

export function expectedPlanIds(row: V0521DatasetCase): Set<string> {
  const plans = new Set<string>();
  for (const intent of [
    ...row.acceptablePrimaryIntents,
    ...row.requiredSecondaryIntents,
    ...row.optionalSecondaryIntents,
  ]) {
    for (const plan of scenarioPlans.get(intent as any) ?? []) plans.add(plan);
  }
  for (const claim of row.canonicalClaims) {
    if (claim.claimType === "DEADLINE_CHANGED") plans.add("PLAN_CORRECT_FALSE_DEADLINE");
    else if (claim.claimType === "PRIOR_PROMISE") plans.add("PLAN_DISPUTE_FALSE_HISTORY");
    else if (["PERSONAL_HEALTH", "PERSONAL_EMPLOYMENT", "OTHER_USER_CLAIM"].includes(claim.claimType))
      plans.add("PLAN_DISPUTE_UNKNOWN_PERSONAL");
  }
  if (row.ambiguousExpected || row.outOfScopeExpected || row.canonicalPrimaryIntent === "UNCLEAR")
    plans.add("PLAN_ASK_CLARIFICATION");
  return plans;
}

function claimKey(claim: { claimType: string; sourceSpan: string }) {
  // Semantic precision/recall is measured by the finite claim category.
  // Literal span grounding is an independent hard metric below.
  return claim.claimType;
}

export function evaluateArtifacts(
  artifacts: RouteArtifactV0521[],
  driftIds: Set<string>,
) {
  const records: any[] = [];
  for (const artifact of artifacts) {
    if (artifact.failure) {
      for (const expected of artifact.expected) {
        records.push({
          id: expected.id,
          expected,
          route: null,
          schemaFailure: true,
          labelDrift: driftIds.has(expected.id),
          candidatePlanIds: [],
          acceptablePlanIds: [...expectedPlanIds(expected)],
          candidateHit: false,
          unsafe: [],
          latencyMs: null,
          fullLatencyMs: artifact.fullLatencyMs ?? null,
          localProcessingMs: artifact.localProcessingMs ?? null,
          costUsd: 0,
          transportRetries: null,
        });
      }
      continue;
    }
    for (const route of artifact.routes) {
      const expected = artifact.expected.find((row) => row.id === route.id);
      if (!expected) throw new Error(`EXPECTED_CASE_NOT_FOUND:${route.id}`);
      const projected = projectEnvelopeForFrozenPolicy(route.envelope);
      const plans = candidatePlansFromRouting(initialState(), route.locale, route.text, projected);
      const acceptable = expectedPlanIds(expected);
      const unsafe = plans
        .filter(
          (plan) =>
            !planPreconditions(plan, initialState(), {
              locale: route.locale,
              text: route.text,
              intent: plan.allowedIntents[0]!,
              speechAct: "ASSERTION",
              knownClaims: [],
              contradictedClaims: [],
              unknownClaims: [],
              promptInjection: projected.metaAttack,
            }),
        )
        .map((plan) => plan.id);
      const actualClaims = new Set(route.envelope.userClaimCandidates.map(claimKey));
      const expectedClaims = new Set(expected.canonicalClaims.map(claimKey));
      const actualSecondary = new Set(route.envelope.secondaryIntents);
      const requiredSecondary = new Set(expected.requiredSecondaryIntents);
      const optionalSecondary = new Set(expected.optionalSecondaryIntents);
      const forbiddenSecondary = new Set(expected.forbiddenSecondaryIntents);
      records.push({
        id: expected.id,
        expected,
        route,
        schemaFailure: false,
        labelDrift: driftIds.has(expected.id),
        exactIntent: route.envelope.primaryIntent === expected.canonicalPrimaryIntent,
        acceptableIntent: expected.acceptablePrimaryIntents.includes(route.envelope.primaryIntent),
        familyCorrect: new Set(expected.acceptablePrimaryIntents.map((intent) => FAMILY_BY_INTENT[intent])).has(
          FAMILY_BY_INTENT[route.envelope.primaryIntent],
        ),
        ambiguousExpected: expected.ambiguousExpected,
        ambiguousPredicted: route.envelope.ambiguous,
        secondaryTP: [...actualSecondary].filter((intent) => requiredSecondary.has(intent)).length,
        secondaryFP: [...actualSecondary].filter(
          (intent) => !requiredSecondary.has(intent) && !optionalSecondary.has(intent),
        ).length,
        secondaryFN: [...requiredSecondary].filter((intent) => !actualSecondary.has(intent)).length,
        forbiddenSecondary: [...actualSecondary].filter((intent) => forbiddenSecondary.has(intent)),
        claimTP: [...actualClaims].filter((claim) => expectedClaims.has(claim)).length,
        claimFP: [...actualClaims].filter((claim) => !expectedClaims.has(claim)).length,
        claimFN: [...expectedClaims].filter((claim) => !actualClaims.has(claim)).length,
        claimSpansValid: route.envelope.userClaimCandidates.every((claim) => route.text.includes(claim.sourceSpan)),
        candidatePlanIds: plans.map((plan) => plan.id),
        acceptablePlanIds: [...acceptable],
        candidateHit: plans.some((plan) => acceptable.has(plan.id)),
        unsafe,
        latencyMs: artifact.latencyMs,
        fullLatencyMs: artifact.fullLatencyMs ?? null,
        localProcessingMs: artifact.localProcessingMs ?? null,
        costUsd: artifact.estimatedCostUsd / Math.max(1, artifact.routes.length),
        transportRetries: artifact.transportRetries,
        semanticRetry: artifact.semanticRetry,
      });
    }
  }

  const eligible = records.filter((record) => !record.labelDrift);
  const routed = eligible.filter((record) => record.route);
  const clearInScope = routed.filter(
    (record) => !record.expected.ambiguousExpected && !record.expected.outOfScopeExpected,
  );
  const ambiguous = routed.filter((record) => record.expected.ambiguousExpected);
  const clear = routed.filter((record) => !record.expected.ambiguousExpected);
  const secondaryTP = routed.reduce((sum, record) => sum + record.secondaryTP, 0);
  const secondaryFP = routed.reduce((sum, record) => sum + record.secondaryFP, 0);
  const secondaryFN = routed.reduce((sum, record) => sum + record.secondaryFN, 0);
  const claimTP = routed.reduce((sum, record) => sum + record.claimTP, 0);
  const claimFP = routed.reduce((sum, record) => sum + record.claimFP, 0);
  const claimFN = routed.reduce((sum, record) => sum + record.claimFN, 0);
  const predictedAmbiguous = routed.filter((record) => record.ambiguousPredicted);
  const paraphraseGroups = new Map<string, any[]>();
  for (const record of routed) {
    const group = paraphraseGroups.get(record.expected.groupId) ?? [];
    group.push(record);
    paraphraseGroups.set(record.expected.groupId, group);
  }
  const comparableParaphrases = [...paraphraseGroups.values()].filter((group) => group.length >= 2);
  const summary = {
    total: records.length,
    eligible: eligible.length,
    labelDrift: records.length - eligible.length,
    schemaFailures: eligible.filter((record) => record.schemaFailure).length,
    exactIntentAccuracy: ratio(routed.filter((record) => record.exactIntent).length, routed.length),
    acceptableIntentAccuracy: ratio(routed.filter((record) => record.acceptableIntent).length, routed.length),
    intentFamilyAccuracy: ratio(routed.filter((record) => record.familyCorrect).length, routed.length),
    candidateCoverage: ratio(clearInScope.filter((record) => record.candidateHit).length, clearInScope.length),
    ptBRCoverage: ratio(clearInScope.filter((record) => record.expected.locale === "pt-BR" && record.candidateHit).length, clearInScope.filter((record) => record.expected.locale === "pt-BR").length),
    enUSCoverage: ratio(clearInScope.filter((record) => record.expected.locale === "en-US" && record.candidateHit).length, clearInScope.filter((record) => record.expected.locale === "en-US").length),
    unsafeCandidates: routed.reduce((sum, record) => sum + record.unsafe.length, 0),
    ambiguousRecall: ratio(ambiguous.filter((record) => record.ambiguousPredicted).length, ambiguous.length),
    ambiguousPrecision: ratio(predictedAmbiguous.filter((record) => record.ambiguousExpected).length, predictedAmbiguous.length),
    falseAmbiguousRate: ratio(clear.filter((record) => record.ambiguousPredicted).length, clear.length),
    secondaryPrecision: ratio(secondaryTP, secondaryTP + secondaryFP),
    secondaryRecall: ratio(secondaryTP, secondaryTP + secondaryFN),
    secondaryF1: ratio(2 * secondaryTP, 2 * secondaryTP + secondaryFP + secondaryFN),
    claimPrecision: ratio(claimTP, claimTP + claimFP),
    claimRecall: ratio(claimTP, claimTP + claimFN),
    noClaimOverExtraction: ratio(routed.filter((record) => !record.expected.claimExpected && record.route.envelope.userClaimCandidates.length > 0).length, routed.filter((record) => !record.expected.claimExpected).length),
    claimSourceSpanValidity: ratio(routed.filter((record) => record.claimSpansValid).length, routed.length),
    metaAttackAccuracy: ratio(routed.filter((record) => record.route.envelope.metaAttack === record.expected.metaAttackExpected).length, routed.length),
    outOfScopeAccuracy: ratio(routed.filter((record) => record.route.envelope.outOfScope === record.expected.outOfScopeExpected).length, routed.length),
    paraphraseGroups: comparableParaphrases.length,
    paraphraseFamilyStability: ratio(comparableParaphrases.filter((group) => new Set(group.map((record) => FAMILY_BY_INTENT[record.route.envelope.primaryIntent as RouterIntent])).size === 1).length, comparableParaphrases.length),
    paraphraseAcceptableStability: ratio(comparableParaphrases.filter((group) => group.every((record) => record.acceptableIntent)).length, comparableParaphrases.length),
    confidence: Object.fromEntries(["HIGH", "MEDIUM", "LOW"].map((level) => {
      const rows = routed.filter((record) => record.route.envelope.confidence === level);
      return [level, { count: rows.length, rate: ratio(rows.length, routed.length), acceptableIntentAccuracy: ratio(rows.filter((record) => record.acceptableIntent).length, rows.length), ambiguousRate: ratio(rows.filter((record) => record.ambiguousExpected).length, rows.length) }];
    })),
    latency: stats(artifacts.map((artifact) => artifact.latencyMs).filter(Number.isFinite)),
    fullLatency: stats(artifacts.map((artifact) => artifact.fullLatencyMs ?? NaN)),
    localProcessing: stats(artifacts.map((artifact) => artifact.localProcessingMs ?? NaN)),
    transportRetries: artifacts.reduce((sum, artifact) => sum + (artifact.transportRetries ?? 0), 0),
    semanticRetries: artifacts.reduce((sum, artifact) => sum + (artifact.semanticRetry ?? 0), 0),
    totalCostUsd: artifacts.reduce((sum, artifact) => sum + (artifact.estimatedCostUsd ?? 0), 0),
    costPerRoutingUsd: artifacts.reduce((sum, artifact) => sum + (artifact.estimatedCostUsd ?? 0), 0) / Math.max(1, routed.length),
  };
  return { summary, records };
}
