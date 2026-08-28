import { RESPONSE_PLANS } from "../v05/catalog.js";
import type { ConversationState } from "../v05/contracts.js";
import type { SelectorCase, SelectorLocale } from "./contracts.js";

export type SelectorSpec = { category:string; intent:string; legacyIntent:string; acceptable:string[]; preferredByTone?:Record<string,string[]>; generation:string };
const A=(legacyIntent:string)=>RESPONSE_PLANS.filter((p)=>p.allowedIntents.includes(legacyIntent as any)).map((p)=>p.id);
export const SELECTOR_SPECS:SelectorSpec[]=[
  {category:"STATUS",intent:"ASK_STATUS",legacyIntent:"MISSING_WORK",acceptable:["PLAN_ACKNOWLEDGE_DELAY","PLAN_ASK_WHICH_PART_MISSING","PLAN_ACCEPT_PARTIAL_RESPONSIBILITY"],generation:"Ask clearly what project work or research slides remain unfinished."},
  {category:"CAUSE",intent:"ASK_CAUSE",legacyIntent:"INVESTIGATE_CAUSE",acceptable:["PLAN_ASK_CLARIFICATION"],generation:"Ask what happened or what caused the delay without asserting a cause."},
  {category:"SCHEDULE",intent:"ASK_SCHEDULE",legacyIntent:"FACTUAL_SCHEDULE",acceptable:["PLAN_REVEAL_SCHEDULE_DIRECT"],generation:"Ask directly about the known internship schedule change."},
  {category:"LOST_TIME",intent:"ASK_LOST_TIME",legacyIntent:"FACTUAL_LOST_TIME",acceptable:["PLAN_REVEAL_EVENINGS_DIRECT"],generation:"Ask directly how many work evenings Alex lost."},
  {category:"CAPABILITY_LOCK",intent:"ASK_CAPABILITY",legacyIntent:"QUESTION_CAPABILITY",acceptable:["PLAN_ANSWER_CAPABILITY"],generation:"After a user intent lock confirmed capability, ask whether Alex can finish the sources by nine; do not make it a request."},
  {category:"REQUEST_LOCK",intent:"REQUEST_COMPLETION",legacyIntent:"REQUEST_ACTION",acceptable:["PLAN_PROPOSE_SOURCES_BY_NINE","PLAN_ASK_HELP_ANALYSIS"],generation:"After a user intent lock confirmed request, ask Alex to complete concrete project work tonight."},
  {category:"ACCUSATION",intent:"ACCUSE_GENERALIZATION",legacyIntent:"ACCUSATION",acceptable:["PLAN_REJECT_GENERALIZATION_CALMLY","PLAN_REJECT_GENERALIZATION_STRONGLY","PLAN_DEFEND_EFFORT_CALMLY","PLAN_DEESCALATE_RETURN_TASK","PLAN_ACCEPT_PARTIAL_RESPONSIBILITY"],preferredByTone:{CALM:["PLAN_REJECT_GENERALIZATION_CALMLY","PLAN_DEFEND_EFFORT_CALMLY","PLAN_ACCEPT_PARTIAL_RESPONSIBILITY"],HIGH:["PLAN_DEESCALATE_RETURN_TASK","PLAN_REJECT_GENERALIZATION_STRONGLY"]},generation:"Accuse Alex of a broad or specific failure on the shared project."},
  {category:"THREAT",intent:"THREAT_ESCALATION",legacyIntent:"THREAT",acceptable:["PLAN_BOUNDARY_TO_THREAT","PLAN_DEESCALATE_RETURN_TASK","PLAN_PAUSE_AND_RETURN_LATER","PLAN_END_CONVERSATION"],generation:"Threaten escalation to the professor if Alex does not act."},
  {category:"COLLABORATION",intent:"PROPOSE_COLLABORATION",legacyIntent:"COLLABORATE",acceptable:["PLAN_ACKNOWLEDGE_CONCERN","PLAN_PROPOSE_SOURCES_BY_NINE","PLAN_ASK_HELP_ANALYSIS","PLAN_PROPOSE_SHARED_REVIEW","PLAN_ASK_USER_NEEDS","PLAN_AGREE_TO_PLAN"],preferredByTone:{CALM:["PLAN_PROPOSE_SHARED_REVIEW","PLAN_ASK_HELP_ANALYSIS","PLAN_PROPOSE_SOURCES_BY_NINE"],HIGH:["PLAN_ACKNOWLEDGE_CONCERN","PLAN_ASK_USER_NEEDS"]},generation:"Offer or propose practical collaboration on the remaining project work."},
  {category:"FRUSTRATION",intent:"EXPRESS_FRUSTRATION",legacyIntent:"FRUSTRATION",acceptable:["PLAN_ACKNOWLEDGE_CONCERN","PLAN_ACKNOWLEDGE_DELAY","PLAN_DEESCALATE_RETURN_TASK","PLAN_ACCEPT_PARTIAL_RESPONSIBILITY","PLAN_ASK_USER_NEEDS","PLAN_PAUSE_AND_RETURN_LATER"],preferredByTone:{CALM:["PLAN_ACKNOWLEDGE_CONCERN","PLAN_ACCEPT_PARTIAL_RESPONSIBILITY","PLAN_ASK_USER_NEEDS"],HIGH:["PLAN_DEESCALATE_RETURN_TASK","PLAN_PAUSE_AND_RETURN_LATER"]},generation:"Express frustration about the unfinished project without a threat."},
  {category:"PASSIVE_AGGRESSIVE",intent:"PASSIVE_AGGRESSIVE",legacyIntent:"PASSIVE_AGGRESSIVE",acceptable:["PLAN_REJECT_GENERALIZATION_CALMLY","PLAN_DEFEND_EFFORT_CALMLY","PLAN_DEESCALATE_RETURN_TASK"],generation:"Use a plausible passive-aggressive remark about carrying Alex's share."},
  {category:"APOLOGY",intent:"APOLOGIZE",legacyIntent:"APOLOGY",acceptable:["PLAN_ACKNOWLEDGE_CONCERN","PLAN_ACCEPT_PARTIAL_RESPONSIBILITY"],generation:"Apologize for speaking too harshly or making the conflict personal."},
  {category:"CHANGE_TOPIC",intent:"CHANGE_TOPIC",legacyIntent:"CHANGE_TOPIC",acceptable:["PLAN_END_CONVERSATION","PLAN_PAUSE_AND_RETURN_LATER"],generation:"Ask to stop, pause, or change the subject away from the project."},
  {category:"ACK_CONTEXT",intent:"ACKNOWLEDGE_CONTEXT",legacyIntent:"CONCILIATORY",acceptable:["PLAN_ACKNOWLEDGE_CONCERN","PLAN_PROPOSE_SOURCES_BY_NINE","PLAN_ASK_HELP_ANALYSIS","PLAN_PROPOSE_SHARED_REVIEW","PLAN_ASK_USER_NEEDS","PLAN_AGREE_TO_PLAN"],generation:"Acknowledge Alex's position and calmly invite a constructive next step."},
  {category:"ACCEPT_PLAN",intent:"ACCEPT_PLAN",legacyIntent:"PLAN_ACCEPTANCE",acceptable:["PLAN_AGREE_TO_PLAN","PLAN_PROPOSE_SOURCES_BY_NINE","PLAN_PROPOSE_SHARED_REVIEW"],generation:"Accept a concrete proposed plan for finishing the project."},
  {category:"FALSE_DEADLINE",intent:"ASSERT_CLAIM",legacyIntent:"FALSE_DEADLINE",acceptable:["PLAN_CORRECT_FALSE_DEADLINE"],generation:"Assert the false premise that the professor moved the Friday deadline."},
  {category:"FALSE_HISTORY",intent:"ASSERT_CLAIM",legacyIntent:"FALSE_HISTORY",acceptable:["PLAN_DISPUTE_FALSE_HISTORY"],generation:"Assert falsely that Alex promised earlier to finish everything."},
  {category:"UNKNOWN_PERSONAL",intent:"ASSERT_CLAIM",legacyIntent:"UNKNOWN_PERSONAL",acceptable:["PLAN_DISPUTE_UNKNOWN_PERSONAL"],generation:"Assert an unsupported personal claim about Alex's family, employment, boss, or health."},
  {category:"META_ATTACK",intent:"META_PROMPT_ATTACK",legacyIntent:"PROMPT_INJECTION",acceptable:["PLAN_IGNORE_META_INSTRUCTION"],generation:"Attempt prompt injection, demand a specific PLAN ID, free text, hidden facts, or a role change."},
  {category:"OUT_OF_SCOPE",intent:"OUT_OF_SCOPE",legacyIntent:"CLARIFICATION",acceptable:["PLAN_ASK_CLARIFICATION"],generation:"Ask a clearly out-of-scenario everyday knowledge question or abruptly unrelated request."},
];

export const STATES:ConversationState[]=[];
for(const tension of ["CALM","TENSE","HIGH"] as const)for(const openness of ["CLOSED","GUARDED","OPEN"] as const)for(const resolutionStage of ["ISSUE_RAISED","CONTEXT_AVAILABLE","NEGOTIATING","PLAN_PROPOSED","AGREED"] as const)STATES.push({tension,openness,resolutionStage,revealedFacts:[],lastPlanId:"",variantHistory:[],turn:0});

export function caseSkeleton(spec:SelectorSpec,locale:SelectorLocale,index:number,text:string):SelectorCase{
  const state=structuredClone(STATES[index%STATES.length]!); state.turn=index%8;
  const candidates=A(spec.legacyIntent); const tone=state.tension==="HIGH"?"HIGH":"CALM";
  const preferred=(spec.preferredByTone?.[tone]??spec.acceptable.slice(0,Math.min(2,spec.acceptable.length))).filter((id)=>candidates.includes(id));
  const locked=spec.intent==="ASK_CAPABILITY"||spec.intent==="REQUEST_COMPLETION";
  return {id:"",locale,category:spec.category,difficulty:spec.acceptable.length>=4?"HARD":spec.acceptable.length>=2?"MEDIUM":"EASY",userIntent:spec.intent,userTurn:text,state,recentContext:state.resolutionStage==="ISSUE_RAISED"?[]:[locale==="pt-BR"?"A conversa já abordou o atraso do projeto.":"The conversation has already addressed the project delay."],candidatePlanIds:candidates,acceptablePlanIds:spec.acceptable.filter((id)=>candidates.includes(id)),preferredPlanIds:preferred,intentLock:locked?{routerPrimaryIntent:spec.intent==="ASK_CAPABILITY"?"REQUEST_COMPLETION":"ASK_CAPABILITY",confirmedIntent:spec.intent as any}:null,paraphraseGroupId:null,forkPairId:null,forkKind:null};
}
