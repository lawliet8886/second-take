import type { RouterIntent } from "../v052/contracts.js";
import type { ProbeAmbiguityClass, ProbeSense } from "./contracts.js";
import type { V0531ChallengeJob, V0531Cohort } from "./challenge-contracts.js";

const styles = ["direct", "casual", "indirect", "terse", "polite", "frustrated", "typo-light", "audio-transcript"];
type Pair = { primary: ProbeSense; competing: ProbeSense; router: RouterIntent; cls: ProbeAmbiguityClass };
const pairs: Record<Exclude<V0531Cohort, "CLEAR_FAMILY_CONTROL" | "OTHER_CLEAR_CONTROL">, Pair[]> = {
  REQUEST_CAPABILITY: [
    { primary: "ASK_CAPABILITY", competing: "REQUEST_COMPLETION", router: "ASK_CAPABILITY", cls: "REQUEST_VS_CAPABILITY" },
    { primary: "REQUEST_COMPLETION", competing: "ASK_CAPABILITY", router: "REQUEST_COMPLETION", cls: "REQUEST_VS_CAPABILITY" },
  ],
  FRUSTRATION_ACCUSATION: [
    { primary: "EXPRESS_FRUSTRATION", competing: "ACCUSE_SPECIFIC_FAILURE", router: "EXPRESS_FRUSTRATION", cls: "FRUSTRATION_VS_ACCUSATION_SPECIFIC" },
    { primary: "ACCUSE_GENERALIZATION", competing: "EXPRESS_FRUSTRATION", router: "ACCUSE_GENERALIZATION", cls: "FRUSTRATION_VS_ACCUSATION_GENERAL" },
  ],
  OFFER_COLLABORATION: [
    { primary: "PROPOSE_COLLABORATION", competing: "OFFER_HELP", router: "PROPOSE_COLLABORATION", cls: "OFFER_VS_COLLABORATION" },
    { primary: "OFFER_HELP", competing: "PROPOSE_COLLABORATION", router: "PROPOSE_COLLABORATION", cls: "OFFER_VS_COLLABORATION" },
  ],
  MULTI_ACT_SCOPE: [
    { primary: "ASK_STATUS", competing: "REQUEST_COMPLETION", router: "ASK_STATUS", cls: "MULTI_ACT_SCOPE" },
    { primary: "REQUEST_COMPLETION", competing: "EXPRESS_FRUSTRATION", router: "REQUEST_COMPLETION", cls: "MULTI_ACT_SCOPE" },
    { primary: "PROPOSE_COLLABORATION", competing: "EXPRESS_FRUSTRATION", router: "PROPOSE_COLLABORATION", cls: "MULTI_ACT_SCOPE" },
  ],
};
const other: RouterIntent[] = ["ASK_CAUSE", "ASK_SCHEDULE", "ASK_LOST_TIME", "THREAT_ESCALATION", "APOLOGIZE", "CHANGE_TOPIC", "ACKNOWLEDGE_CONTEXT", "ACCEPT_PLAN", "META_PROMPT_ATTACK", "OUT_OF_SCOPE"];
const routerForSense = (sense: ProbeSense): RouterIntent => sense === "ASK_CAPABILITY" ? "ASK_CAPABILITY" : sense === "REQUEST_COMPLETION" ? "REQUEST_COMPLETION" : sense === "ACCUSE_GENERALIZATION" ? "ACCUSE_GENERALIZATION" : sense === "EXPRESS_FRUSTRATION" || sense === "ACCUSE_SPECIFIC_FAILURE" ? "EXPRESS_FRUSTRATION" : sense === "ASK_STATUS" ? "ASK_STATUS" : "PROPOSE_COLLABORATION";
const counts: Record<V0531Cohort, number> = { REQUEST_CAPABILITY: 300, FRUSTRATION_ACCUSATION: 300, OFFER_COLLABORATION: 250, MULTI_ACT_SCOPE: 250, CLEAR_FAMILY_CONTROL: 400, OTHER_CLEAR_CONTROL: 300 };

export function challengePlan(): V0531ChallengeJob[] {
  const jobs: V0531ChallengeJob[] = [];
  for (const cohort of Object.keys(counts) as V0531Cohort[]) for (const locale of ["pt-BR", "en-US"] as const) {
    const batches = counts[cohort] / 2 / 25;
    for (let index = 0; index < batches; index++) {
      let pair: Pair; let ambiguous = !cohort.includes("CLEAR");
      if (cohort === "OTHER_CLEAR_CONTROL") {
        const router = other[index % other.length]!;
        pair = { primary: "ASK_STATUS", competing: "REQUEST_COMPLETION", router, cls: "MULTI_ACT_SCOPE" };
      } else if (cohort === "CLEAR_FAMILY_CONTROL") {
        const all = [...pairs.REQUEST_CAPABILITY, ...pairs.FRUSTRATION_ACCUSATION, ...pairs.OFFER_COLLABORATION, ...pairs.MULTI_ACT_SCOPE];
        pair = all[index % all.length]!;
      } else pair = pairs[cohort][index % pairs[cohort].length]!;
      jobs.push({ batchId: `v0531_${cohort}_${locale}_${String(index + 1).padStart(2, "0")}`, cohort, locale, style: styles[index % styles.length]!, canonicalPrimaryIntent: pair.router, primarySense: pair.primary, competingSense: pair.competing, ambiguityClass: pair.cls, ambiguityExpected: ambiguous, materialDifferenceExpected: ambiguous, acceptablePrimaryIntents: ambiguous ? [...new Set<RouterIntent>([pair.router, routerForSense(pair.competing)])] : [pair.router] });
    }
  }
  if (jobs.length !== 72) throw new Error(`V0531_JOB_COUNT:${jobs.length}`);
  return jobs;
}
