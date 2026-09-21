import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { parseEnvelopeV0521, ROUTER_MODEL_CONFIG_V0521, ROUTER_SYSTEM_PROMPT_V0521, routerBatchSchemaV0521, validateEnvelopeV0521 } from "../frozen.js";
import type { RouterPort, RouterResult, UsageMetadata } from "../domain/contracts.js";
import { ConcurrencyLimiter } from "../resilience/concurrency-limiter.js";

const num=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)?value:0;
const usageOf=(response:any):UsageMetadata=>{const usage=response?.usageMetadata??{};return{inputTokens:num(usage.promptTokenCount),outputTokens:num(usage.candidatesTokenCount),thinkingTokens:num(usage.thoughtsTokenCount),totalTokens:num(usage.totalTokenCount)};};
const isTransient=(error:unknown)=>/\b(429|499|500|503|504)\b|ECONNRESET|fetch failed|timeout|timed out|deadline|capacity|abort/i.test(String((error as any)?.message??error));

export class VertexRouterClient implements RouterPort {
  readonly #client:GoogleGenAI;
  constructor(project:string,location="global",private readonly limiter=new ConcurrencyLimiter(2,8),private readonly model=ROUTER_MODEL_CONFIG_V0521.model){
    this.#client=new GoogleGenAI({vertexai:true,project,location,httpOptions:{baseUrl:"https://aiplatform.googleapis.com",apiVersion:"v1"}});
  }

  async route(input:{requestId:string;text:string;locale:"pt-BR"|"en-US";deadlineMs:number}):Promise<RouterResult>{
    const started=performance.now();
    return this.limiter.run(async()=>{
      let last:unknown,retries=0,structuralRetries=0;
      for(let structural=0;structural<2;structural++){
        for(let transport=0;transport<3;transport++){
          const remaining=Math.floor(input.deadlineMs-(performance.now()-started));
          if(remaining<1500)throw last??new Error("ROUTER_GLOBAL_DEADLINE");
          try{
            const response=await this.#client.models.generateContent({
              model:this.model,
              contents:JSON.stringify({scenario:"Alex is the user's teammate. Two research slides are unfinished and the presentation deadline is Friday.",items:[{id:input.requestId,locale:input.locale,text:input.text}],instruction:"Return exactly one route per item, preserving each id. Claim and reference spans must be exact contiguous substrings of that item's text.",...(structural?{repair:"The previous output violated the finite schema or exact-span contract. Return one fully valid replacement without changing the input."}:{})}),
              config:{systemInstruction:ROUTER_SYSTEM_PROMPT_V0521,thinkingConfig:{thinkingLevel:ThinkingLevel.LOW},maxOutputTokens:ROUTER_MODEL_CONFIG_V0521.maxOutputTokens,responseMimeType:"application/json",responseJsonSchema:routerBatchSchemaV0521([input.requestId]),httpOptions:{timeout:remaining,retryOptions:{attempts:1}}},
            });
            try{
              const raw=JSON.parse(response.text??"{}"),row=raw?.routes?.[0];
              if(row?.id!==input.requestId)throw new Error("ROUTER_ID_MISMATCH");
              const envelope=parseEnvelopeV0521(row.envelope),validation=validateEnvelopeV0521(input.text,envelope);
              if(!validation.valid)throw new Error(`ROUTER_ENVELOPE_INVALID:${validation.violations.join("|")}`);
              return{envelope,latencyMs:Math.round(performance.now()-started),retries,usage:usageOf(response)};
            }catch(error){last=error;if(structural===1)throw error;structuralRetries++;break;}
          }catch(error){
            last=error;
            if(!isTransient(error)||structuralRetries>structural)throw error;
            const after=Math.floor(input.deadlineMs-(performance.now()-started));
            if(transport===2||after<1500)throw error;
            retries++;
            const backoff=Math.min(250*2**transport,Math.max(0,after-1500));
            if(backoff)await new Promise(resolve=>setTimeout(resolve,backoff));
          }
        }
      }
      throw last??new Error("ROUTER_GLOBAL_DEADLINE");
    });
  }
}
