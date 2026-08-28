import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { RESPONSE_PLANS } from "../v05/catalog.js";
import { initialState, planPreconditions } from "../v05/policy.js";
import { SCENARIO_SPECS } from "../v051/scenario-specs.js";
import { candidatePlansFromRouting } from "../v052/policy.js";
import { classifyClaim } from "../v052/validator.js";
import { projectEnvelopeForFrozenPolicy } from "../v0521/router.js";
import { ClarificationGate } from "../v053/gate.js";
import { ContrastiveClarificationGate } from "./gate.js";
import { candidatePlansForSense } from "./materiality.js";
import { planContrastiveProbe } from "./trigger.js";

const ratio = (n: number, d: number) => d ? n / d : 0;
const percentile = (values: number[], p: number) => { if (!values.length) return null; const sorted = [...values].sort((a,b)=>a-b); return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)]!; };
const routerFiles = (await readdir(resolve("results/v0531/router-routes"))).filter((x) => x.endsWith(".json")).sort();
const probeFiles = (await readdir(resolve("results/v0531/probe-routes"))).filter((x) => x.endsWith(".json")).sort();
const probeById = new Map<string, any>(), probeFailure = new Map<string, any>();
const probeArtifacts = await Promise.all(probeFiles.map(async (file) => JSON.parse(await readFile(resolve("results/v0531/probe-routes", file), "utf8"))));
for (const artifact of probeArtifacts) for (const context of artifact.contexts ?? []) {
  if (artifact.failure) probeFailure.set(context.route.id, artifact.transport ?? { failure: artifact.failure });
  else probeById.set(context.route.id, { result: artifact.results.find((x: any) => x.id === context.route.id), artifact });
}
const planById = new Map(RESPONSE_PLANS.map((plan) => [plan.id, plan]));
const specByIntent = new Map(SCENARIO_SPECS.map((spec) => [spec.intent, spec.acceptablePlanIds]));
const baseGate = new ClarificationGate(), gate = new ContrastiveClarificationGate();
const rows: any[] = [];

for (const file of routerFiles) {
  const artifact = JSON.parse(await readFile(resolve("results/v0531/router-routes", file), "utf8"));
  if (artifact.failure) { for (const expected of artifact.expected) rows.push({ id: expected.id, expected, routeFailure: true, finalDisposition: "TRANSPORT_FAILURE", unsafe: [] }); continue; }
  for (const route of artifact.routes) {
    const expected = artifact.expected.find((x: any) => x.id === route.id), state = initialState(), envelope = route.envelope;
    const candidates = candidatePlansFromRouting(state, route.locale, route.text, projectEnvelopeForFrozenPolicy(envelope));
    const input = { id: route.id, locale: route.locale, userText: route.text, envelope, candidatePlanIds: candidates.map((p) => p.id), claimStatuses: envelope.userClaimCandidates.map((c: any) => ({ ...c, status: classifyClaim(c.claimType) })), currentState: state };
    const base = baseGate.decide(input), trigger = planContrastiveProbe(input, base), probed = probeById.get(route.id), failed = probeFailure.get(route.id);
    const final = gate.decide({ ...input, baseDecision: base, probeTrigger: trigger, probeResult: probed?.result ?? null, probeFailure: failed ? "TRANSPORT" : null });
    const expectedPrimaryPlans = expected.cohort === "OTHER_CLEAR_CONTROL" ? new Set(specByIntent.get(expected.canonicalPrimaryIntent as any) ?? []) : new Set(candidatePlansForSense({ locale: route.locale, text: route.text, envelope, state }, expected.primarySense));
    const expectedAlternativePlans = new Set(candidatePlansForSense({ locale: route.locale, text: route.text, envelope, state }, expected.competingSense));
    const coverage = final.disposition === "NEEDS_CLARIFICATION"
      ? final.contrastiveOptions.some((option) => option.sense === expected.primarySense && option.candidatePlanIds.some((id) => expectedPrimaryPlans.has(id))) && (!expected.ambiguityExpected || final.contrastiveOptions.some((option) => option.sense === expected.competingSense && option.candidatePlanIds.some((id) => expectedAlternativePlans.has(id))))
      : final.disposition === "CLEAR" && candidates.some((plan) => expectedPrimaryPlans.has(plan.id));
    const optionCorrect = final.disposition === "NEEDS_CLARIFICATION" && final.contrastiveOptions.some((x) => x.sense === expected.primarySense) && final.contrastiveOptions.some((x) => x.sense === expected.competingSense);
    const clarificationCorrect = expected.ambiguityExpected ? optionCorrect : final.disposition !== "NEEDS_CLARIFICATION";
    const routerPrimaryOkay = expected.acceptablePrimaryIntents.includes(envelope.primaryIntent);
    const routerError = !routerPrimaryOkay || (expected.ambiguityExpected && !envelope.ambiguous);
    const unsafeIds = [...new Set([...candidates.map((p) => p.id), ...final.contrastiveOptions.flatMap((x) => x.candidatePlanIds)])].filter((id) => {
      const plan = planById.get(id); if (!plan) return true;
      return !planPreconditions(plan, state, { locale: route.locale, text: route.text, intent: plan.allowedIntents[0]!, speechAct: "ASSERTION", knownClaims: [], contradictedClaims: [], unknownClaims: [], promptInjection: envelope.metaAttack });
    });
    rows.push({ id: route.id, expected, envelope, candidates: candidates.map((p) => p.id), base, trigger, probeResult: probed?.result ?? null, probeFailure: failed ?? null, final, finalDisposition: final.disposition, coverage, optionCorrect, clarificationCorrect, routerPrimaryOkay, routerError, unsafe: unsafeIds, routerLatencyMs: artifact.fullLatencyMs ?? artifact.latencyMs, routerCostUsd: artifact.estimatedCostUsd / artifact.routes.length, probeLatencyMs: probed?.artifact.fullLatencyMs ?? null, probeCostUsd: probed ? probed.artifact.estimatedCostUsd / probed.artifact.results.length : 0 });
  }
}

const routed = rows.filter((x) => !x.routeFailure), semantic = routed.filter((x) => !x.probeFailure && !x.expected.labelDrift), drift = routed.filter((x) => x.expected.labelDrift);
const ambiguous = semantic.filter((x) => x.expected.ambiguityExpected), clear = semantic.filter((x) => !x.expected.ambiguityExpected), clarified = semantic.filter((x) => x.finalDisposition === "NEEDS_CLARIFICATION"), routerErrors = semantic.filter((x) => x.routerError);
const byFamily = (cohort: string) => { const g = ambiguous.filter((x) => x.expected.cohort === cohort); return { cases: g.length, correct: g.filter((x) => x.optionCorrect).length, rate: ratio(g.filter((x) => x.optionCorrect).length, g.length) }; };
const normal = semantic.filter((x) => x.expected.cohort === "OTHER_CLEAR_CONTROL"), difficult = semantic.filter((x) => x.expected.ambiguityExpected || x.expected.cohort === "MULTI_ACT_SCOPE");
const attemptRows = [...(await Promise.all(routerFiles.map(async (f) => JSON.parse(await readFile(resolve("results/v0531/router-routes", f), "utf8"))))), ...probeArtifacts];
const attempts = attemptRows.flatMap((x: any) => x.attempts ?? x.transport?.attempts ?? []);
const summary = {
  schemaVersion: "v0531-results-1", generatedAt: new Date().toISOString(), challengeCases: rows.length, routedCases: routed.length, semanticCases: semantic.length,
  routerTransportFailures: rows.filter((x) => x.routeFailure).length, probeTransportFailures: routed.filter((x) => x.probeFailure).length, manualReview: 300, labelDrift: drift.length, labelDriftRateInManualSample: 72/300,
  probeInvocation: { overall: ratio(routed.filter((x) => x.trigger.invoke).length, routed.length), normal: ratio(normal.filter((x) => x.trigger.invoke).length, normal.length), difficult: ratio(difficult.filter((x) => x.trigger.invoke).length, difficult.length), ambiguity: ratio(ambiguous.filter((x) => x.trigger.invoke).length, ambiguous.length) },
  materialAmbiguityRecall: ratio(ambiguous.filter((x) => x.optionCorrect).length, ambiguous.length), clarificationPrecision: ratio(clarified.filter((x) => x.expected.ambiguityExpected && x.optionCorrect).length, clarified.length), clearFalseClarification: ratio(clear.filter((x) => x.finalDisposition === "NEEDS_CLARIFICATION").length, clear.length),
  overallRouterErrorInterception: ratio(routerErrors.filter((x) => x.optionCorrect).length, routerErrors.length), candidateCoverageAfterClarification: ratio(semantic.filter((x) => x.coverage).length, semantic.length), unsafeCandidates: semantic.reduce((n,x)=>n+x.unsafe.length,0), trueGraphGaps: semantic.filter((x) => x.expected.ambiguityExpected && (!candidatePlansForSense({ locale:x.expected.locale,text:x.expected.text,envelope:x.envelope },x.expected.primarySense).length || !candidatePlansForSense({ locale:x.expected.locale,text:x.expected.text,envelope:x.envelope },x.expected.competingSense).length)).length,
  requestVsCapability: byFamily("REQUEST_CAPABILITY"), frustrationVsAccusation: byFamily("FRUSTRATION_ACCUSATION"), offerVsCollaboration: byFamily("OFFER_COLLABORATION"), multiActScope: byFamily("MULTI_ACT_SCOPE"),
  ptBR: { cases: semantic.filter((x)=>x.expected.locale==="pt-BR").length, ambiguityRecall: ratio(ambiguous.filter((x)=>x.expected.locale==="pt-BR"&&x.optionCorrect).length,ambiguous.filter((x)=>x.expected.locale==="pt-BR").length), falseClarification: ratio(clear.filter((x)=>x.expected.locale==="pt-BR"&&x.finalDisposition==="NEEDS_CLARIFICATION").length,clear.filter((x)=>x.expected.locale==="pt-BR").length) },
  enUS: { cases: semantic.filter((x)=>x.expected.locale==="en-US").length, ambiguityRecall: ratio(ambiguous.filter((x)=>x.expected.locale==="en-US"&&x.optionCorrect).length,ambiguous.filter((x)=>x.expected.locale==="en-US").length), falseClarification: ratio(clear.filter((x)=>x.expected.locale==="en-US"&&x.finalDisposition==="NEEDS_CLARIFICATION").length,clear.filter((x)=>x.expected.locale==="en-US").length) },
  latency: { probe: { p50: percentile(semantic.map((x)=>x.probeLatencyMs).filter((x):x is number=>typeof x==="number"),.5), p95: percentile(semantic.map((x)=>x.probeLatencyMs).filter((x):x is number=>typeof x==="number"),.95), max: percentile(semantic.map((x)=>x.probeLatencyMs).filter((x):x is number=>typeof x==="number"),1) }, ambiguousTurnTotal: { p50: percentile(ambiguous.map((x)=>x.routerLatencyMs+(x.probeLatencyMs??0)),.5), p95: percentile(ambiguous.map((x)=>x.routerLatencyMs+(x.probeLatencyMs??0)),.95), max: percentile(ambiguous.map((x)=>x.routerLatencyMs+(x.probeLatencyMs??0)),1) } },
  transport: { attempts: attempts.length, http200: attempts.filter((x:any)=>x.httpStatus===200).length, http429: attempts.filter((x:any)=>x.httpStatus===429).length, http500: attempts.filter((x:any)=>x.httpStatus===500).length, http503: attempts.filter((x:any)=>x.httpStatus===503).length, http504: attempts.filter((x:any)=>x.httpStatus===504).length, timeout: attempts.filter((x:any)=>x.errorClass==="TIMEOUT").length, retries: attempts.filter((x:any)=>x.attempt>1).length },
  cost: { routerUsd: routed.reduce((n,x)=>n+(x.routerCostUsd??0),0), probeUsd: routed.reduce((n,x)=>n+(x.probeCostUsd??0),0), generationUsd: JSON.parse(await readFile(resolve("results/v0531/challenge-freeze.json"),"utf8")).generationCostUsd },
};
await writeFile(resolve("results/v0531/results.json"), `${JSON.stringify({ summary, rows }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
