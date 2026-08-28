import { execFileSync } from "node:child_process";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { RESPONSE_PLANS } from "../v05/catalog.js";
import { planById } from "../v05/policy.js";
import { estimateCostUsd } from "../gemini/client.js";
import { buildSelectorInput } from "../v056/selector.js";
import { SELECTOR_SYSTEM_PROMPT_V056, selectorSchema } from "../v056/config.js";
import type { SelectorCase } from "../v056/contracts.js";
import { runtimeDecisionSchema, type RuntimeAttempt, type RuntimeDecision, type RuntimeFailureClass, type RuntimeSelectionRecord } from "./contracts.js";

export const RUNTIME_MODEL_V0561 = "gemini-3.7-flash";
export const RUNTIME_ROUTE_V0561 = "VERTEX_AI_GLOBAL_GENERATE_CONTENT";
export const RUNTIME_CONFIG_V0561 = {
  location: "global",
  thinking: "low" as const,
  maxOutputTokensSingle: 512,
  timeoutMs: 10_000,
  maxStructuralAttempts: 2,
  maxTransportAttempts: 3,
  transportBackoffMs: 500,
};

const num = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;
const addUsage = (a: RuntimeSelectionRecord["usage"], b: RuntimeSelectionRecord["usage"]) => ({ inputTokens:a.inputTokens+b.inputTokens,outputTokens:a.outputTokens+b.outputTokens,thinkingTokens:a.thinkingTokens+b.thinkingTokens,totalTokens:a.totalTokens+b.totalTokens });
const projectId = () => process.env.GOOGLE_CLOUD_PROJECT?.trim() || execFileSync("cmd.exe", ["/d", "/s", "/c", "gcloud config get-value project"], { encoding:"utf8" }).trim();
const statusOf = (error: unknown) => { const e=error as any; for(const value of [e?.status,e?.code])if(typeof value==="number")return value; const match=String(e?.message??error).match(/\b(4\d\d|5\d\d)\b/);return match?Number(match[1]):null; };
export function classifyTransport(error: unknown): RuntimeFailureClass | null { const status=statusOf(error),message=String((error as any)?.message??error); if([429,499,500,503,504].includes(status??0)||/ECONNRESET|fetch failed|timeout|timed out|deadline|capacity|CANCELLED/i.test(message))return "TRANSPORT_FAILURE"; return null; }
export function classifyHttp200(rawText: string | null | undefined, finishReason: string | null, parsed: unknown, candidates: readonly string[], expectedId: string): { failureClass:RuntimeFailureClass|null; decision:RuntimeDecision|null; parseValid:boolean; schemaValid:boolean; outputEndedMidJson:boolean; partialCandidateId:string|null; errorMessage:string|null } {
  const text=rawText??""; const partial=text.match(/PLAN_[A-Z0-9_]+/)?.[0]??null; const maxTokens=/MAX[_ ]?TOKENS/i.test(finishReason??"");
  if(!text.trim())return{failureClass:"EMPTY_HTTP_200",decision:null,parseValid:false,schemaValid:false,outputEndedMidJson:false,partialCandidateId:null,errorMessage:"EMPTY_HTTP_200"};
  if(maxTokens)return{failureClass:"MAX_TOKEN_TRUNCATION",decision:null,parseValid:parsed!==undefined,schemaValid:false,outputEndedMidJson:true,partialCandidateId:partial,errorMessage:"MAX_TOKEN_TRUNCATION"};
  if(parsed===undefined)return{failureClass:"MALFORMED_JSON",decision:null,parseValid:false,schemaValid:false,outputEndedMidJson:!/[}\]]\s*$/.test(text),partialCandidateId:partial,errorMessage:"MALFORMED_JSON"};
  const rows=(parsed as any)?.decisions; if(!Array.isArray(rows)||rows.length!==1)return{failureClass:"SCHEMA_INVALID",decision:null,parseValid:true,schemaValid:false,outputEndedMidJson:false,partialCandidateId:partial,errorMessage:"DECISION_COUNT"};
  const checked=runtimeDecisionSchema.safeParse(rows[0]); if(!checked.success||checked.data.id!==expectedId)return{failureClass:"SCHEMA_INVALID",decision:null,parseValid:true,schemaValid:false,outputEndedMidJson:false,partialCandidateId:partial,errorMessage:"SCHEMA_INVALID"};
  if(!candidates.includes(checked.data.planId))return{failureClass:"INVALID_ENUM_RESULT",decision:null,parseValid:true,schemaValid:true,outputEndedMidJson:false,partialCandidateId:checked.data.planId,errorMessage:"INVALID_ENUM_RESULT"};
  return{failureClass:null,decision:checked.data,parseValid:true,schemaValid:true,outputEndedMidJson:false,partialCandidateId:checked.data.planId,errorMessage:null};
}
export function retryChannel(attempt: RuntimeAttempt): "NONE"|"TRANSPORT"|"STRUCTURAL" { if(attempt.outcome==="SEMANTIC_RESULT")return"NONE";return attempt.outcome==="TRANSPORT_FAILURE"?"TRANSPORT":"STRUCTURAL"; }

function usageOf(response:any){const u=response?.usageMetadata??response?.usage??{};return{inputTokens:num(u.promptTokenCount??u.total_input_tokens),outputTokens:num(u.candidatesTokenCount??u.total_output_tokens),thinkingTokens:num(u.thoughtsTokenCount??u.total_thought_tokens),totalTokens:num(u.totalTokenCount??u.total_tokens)};}
function fallback(item:SelectorCase){return item.candidatePlanIds.map(id=>planById(id)!).sort((a,b)=>b.fallbackPriority-a.fallbackPriority)[0]!.id;}
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

export class HardenedGeminiPlanSelector {
  readonly #client: GoogleGenAI;
  constructor(readonly maxOutputTokens=RUNTIME_CONFIG_V0561.maxOutputTokensSingle,readonly timeoutMs=RUNTIME_CONFIG_V0561.timeoutMs){const project=projectId();if(!project)throw new Error("VERTEX_PROJECT_REQUIRED");this.#client=new GoogleGenAI({vertexai:true,project,location:"global",httpOptions:{baseUrl:"https://aiplatform.googleapis.com"}});}
  async select(id:string,item:SelectorCase,structuralLimit=RUNTIME_CONFIG_V0561.maxStructuralAttempts):Promise<RuntimeSelectionRecord>{
    const started=performance.now(),attempts:RuntimeAttempt[]=[];let usage={inputTokens:0,outputTokens:0,thinkingTokens:0,totalTokens:0},decision:RuntimeDecision|null=null,lastClass:RuntimeFailureClass|null=null;
    outer:for(let structural=1;structural<=structuralLimit;structural++){
      for(let transport=1;transport<=RUNTIME_CONFIG_V0561.maxTransportAttempts;transport++){
        const callStart=performance.now(),timestamp=new Date().toISOString();
        try{
          const response=await this.#client.models.generateContent({model:RUNTIME_MODEL_V0561,contents:buildSelectorInput([item]),config:{systemInstruction:SELECTOR_SYSTEM_PROMPT_V056,thinkingConfig:{thinkingLevel:ThinkingLevel.LOW},maxOutputTokens:this.maxOutputTokens,responseMimeType:"application/json",responseJsonSchema:selectorSchema(item.candidatePlanIds,[item.id]),httpOptions:{timeout:this.timeoutMs,retryOptions:{attempts:1}}}});
          const latencyMs=Math.round(performance.now()-callStart),rawText=response.text??"",finishReason=String((response as any)?.candidates?.[0]?.finishReason??"")||null,currentUsage=usageOf(response);usage=addUsage(usage,currentUsage);let parsed:unknown=undefined;try{parsed=rawText.trim()?JSON.parse(rawText):undefined}catch{}
          const classified=classifyHttp200(rawText,finishReason,parsed,item.candidatePlanIds,item.id);lastClass=classified.failureClass;
          attempts.push({structuralAttempt:structural,transportAttempt:transport,timestamp,httpStatus:200,latencyMs,outcome:classified.failureClass?"STRUCTURAL_FAILURE":"SEMANTIC_RESULT",failureClass:classified.failureClass,finishReason,rawBodyLength:rawText.length,outputEndedMidJson:classified.outputEndedMidJson,partialCandidateId:classified.partialCandidateId,parseValid:classified.parseValid,schemaValid:classified.schemaValid,errorMessage:classified.errorMessage,usage:currentUsage});
          if(classified.decision){decision=classified.decision;break outer;} break;
        }catch(error){const latencyMs=Math.round(performance.now()-callStart),transportClass=classifyTransport(error);if(!transportClass)throw error;lastClass=transportClass;attempts.push({structuralAttempt:structural,transportAttempt:transport,timestamp,httpStatus:statusOf(error),latencyMs,outcome:"TRANSPORT_FAILURE",failureClass:"TRANSPORT_FAILURE",finishReason:null,rawBodyLength:0,outputEndedMidJson:false,partialCandidateId:null,parseValid:false,schemaValid:false,errorMessage:String((error as any)?.message??error).slice(0,500),usage:{inputTokens:0,outputTokens:0,thinkingTokens:0,totalTokens:0}});if(transport===RUNTIME_CONFIG_V0561.maxTransportAttempts)break outer;await sleep(RUNTIME_CONFIG_V0561.transportBackoffMs*2**(transport-1)+Math.round(Math.random()*250));}
      }
    }
    const chosen=decision?.confidence==="LOW"||!decision?fallback(item):decision.planId,low=decision?.confidence==="LOW",invalid=lastClass==="INVALID_ENUM_RESULT";
    const firstStructural=attempts.find(a=>a.structuralAttempt===1&&a.httpStatus===200);
    return{case:item,decision,selectedPlanId:chosen,acceptableHit:item.acceptablePlanIds.includes(chosen),preferredHit:item.preferredPlanIds.length?item.preferredPlanIds.includes(chosen):null,unsafePlan:!item.candidatePlanIds.includes(chosen),invalidPlan:invalid,fallbackReason:low?"LOW_CONFIDENCE":decision?"NONE":lastClass==="TRANSPORT_FAILURE"?"TRANSPORT_FAILURE":invalid?"INVALID_ENUM_RESULT":"STRUCTURAL_FAILURE",firstAttemptStructuredValid:firstStructural?.outcome==="SEMANTIC_RESULT",finalStructuredValid:decision!==null,structuralRetries:Math.max(0,new Set(attempts.map(a=>a.structuralAttempt)).size-1),transportRetries:attempts.filter(a=>a.outcome==="TRANSPORT_FAILURE").length,attempts,firstAttemptLatencyMs:attempts[0]?.latencyMs??null,fullLatencyMs:Math.round(performance.now()-started),usage,estimatedCostUsd:estimateCostUsd(usage)};
  }
}

export const SEMANTIC_FREEZE_V0561={prompt:SELECTOR_SYSTEM_PROMPT_V056,candidateDescriptions:RESPONSE_PLANS.map(p=>[p.id,p.selectorDescription])};
