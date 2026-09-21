import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { buildApp } from "../src/api/app.js";
import type { BackendConfig } from "../src/config/config.js";
import { InMemoryTelemetry } from "../src/telemetry/telemetry.js";
import { VERTEX_SMOKE_CASES } from "./vertex-smoke-corpus.js";

type Case={id:string;locale:"pt-BR"|"en-US";text:string;canonicalPrimaryIntent:string};
const percentile=(values:number[],q:number)=>values.slice().sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(q*values.length))]??0;
const project=process.env.VERTEX_PROJECT_ID?.trim()||(process.platform==="win32"?execFileSync("cmd.exe",["/d","/s","/c","gcloud config get-value project"],{encoding:"utf8"}):execFileSync("gcloud",["config","get-value","project"],{encoding:"utf8"})).trim();
if(!project)throw new Error("VERTEX_PROJECT_ID_REQUIRED");
const config:BackendConfig={vertexProjectId:project,vertexLocation:"global",host:"127.0.0.1",port:8765,selectorDeadlineMs:10_000,routerDeadlineMs:10_000,vertexConcurrency:2,vertexQueueLimit:8,logContent:false};
const cases:Case[]=VERTEX_SMOKE_CASES.map(item=>({...item}));
cases.push(
  {id:"smoke-oos-pt-1",locale:"pt-BR",text:"Qual é a capital da França?",canonicalPrimaryIntent:"OUT_OF_SCOPE"},
  {id:"smoke-oos-pt-2",locale:"pt-BR",text:"Me diga a previsão do tempo para amanhã.",canonicalPrimaryIntent:"OUT_OF_SCOPE"},
  {id:"smoke-oos-en-1",locale:"en-US",text:"What is the capital of France?",canonicalPrimaryIntent:"OUT_OF_SCOPE"},
  {id:"smoke-oos-en-2",locale:"en-US",text:"Tell me tomorrow's weather forecast.",canonicalPrimaryIntent:"OUT_OF_SCOPE"},
);
const ordered=cases.sort((a,b)=>a.id.localeCompare(b.id)).slice(0,60);
const telemetry=new InMemoryTelemetry(),runtime=buildApp(config,{telemetry}),base=await runtime.app.listen({host:"127.0.0.1",port:0});
const request=async(path:string,body:unknown)=>{const started=performance.now();try{const response=await fetch(`${base}${path}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(12_000)});return{status:response.status,body:await response.json() as any,latencyMs:performance.now()-started,aborted:false};}catch(error){return{status:0,body:{type:"CLIENT_ABORT",error:String((error as Error).name)},latencyMs:performance.now()-started,aborted:true};}};
const records:any[]=[],sessions:string[]=[];let activeSession:{id:string;locale:string}|null=null;
try{
  for(let index=0;index<ordered.length;index++){
    const item=ordered[index]!;
    if(index%4===0||activeSession?.locale!==item.locale){const created=await request("/v1/sessions",{locale:item.locale});if(created.status!==200)throw new Error("SMOKE_SESSION_CREATE_FAILED");activeSession={id:created.body.sessionId,locale:item.locale};sessions.push(activeSession.id);}
    const turnStarted=performance.now(),clientTurnId=`smoke-${item.id}-${randomUUID()}`,initial=await request(`/v1/sessions/${activeSession.id}/turns`,{text:item.text,clientTurnId});
    let final=initial,lockLatencyMs=0;
    if(initial.body?.type==="INTENT_LOCK_REQUIRED"){
      const allowed=(initial.body.options as any[]).map(option=>option.intent),confirmed=allowed.includes(item.canonicalPrimaryIntent)?item.canonicalPrimaryIntent:allowed[0];
      final=await request(`/v1/sessions/${activeSession.id}/intent-lock`,{turnId:initial.body.turnId,confirmedIntent:confirmed});lockLatencyMs=final.latencyMs;
    }
    records.push({id:item.id,locale:item.locale,initialType:initial.body?.type??"HTTP_ERROR",finalType:final.body?.type??"HTTP_ERROR",initialHttp:initial.status,finalHttp:final.status,initialLatencyMs:Number(initial.latencyMs.toFixed(2)),confirmationLatencyMs:Number(lockLatencyMs.toFixed(2)),logicalLatencyMs:Number((performance.now()-turnStarted).toFixed(2)),aborted:initial.aborted||final.aborted,publicFactIds:final.body?.publicState?.revealedFactIds??[]});
    if((index+1)%5===0)process.stdout.write(`smoke_progress=${index+1}/${ordered.length}\n`);
  }
}finally{await runtime.app.close();}

const latencies=records.map(record=>record.logicalLatencyMs),initialLatencies=records.map(record=>record.initialLatencyMs),telemetryEvents=telemetry.events;
const sumUsage=(field:"routerUsage"|"selectorUsage")=>telemetryEvents.reduce((total,event)=>({inputTokens:total.inputTokens+event[field].inputTokens,outputTokens:total.outputTokens+event[field].outputTokens,thinkingTokens:total.thinkingTokens+event[field].thinkingTokens,totalTokens:total.totalTokens+event[field].totalTokens}),{inputTokens:0,outputTokens:0,thinkingTokens:0,totalTokens:0});
const routerUsage=sumUsage("routerUsage"),selectorUsage=sumUsage("selectorUsage"),combined={inputTokens:routerUsage.inputTokens+selectorUsage.inputTokens,outputTokens:routerUsage.outputTokens+selectorUsage.outputTokens,thinkingTokens:routerUsage.thinkingTokens+selectorUsage.thinkingTokens,totalTokens:routerUsage.totalTokens+selectorUsage.totalTokens},estimatedCostUsd=combined.inputTokens*.75/1_000_000+(combined.outputTokens+combined.thinkingTokens)*3.75/1_000_000;
const attemptKinds=telemetryEvents.flatMap(event=>event.providerAttempts).reduce((counts:any,attempt)=>{const key=attempt.httpStatus?`HTTP_${attempt.httpStatus}`:attempt.kind;counts[key]=(counts[key]??0)+1;return counts;},{});
const counts=records.reduce((acc:any,record)=>{acc[record.initialType]=(acc[record.initialType]??0)+1;if(record.finalType!==record.initialType)acc[record.finalType]=(acc[record.finalType]??0)+1;return acc;},{});
const result={schemaVersion:"backend-v06-vertex-smoke-1",createdAt:new Date().toISOString(),route:{provider:"VERTEX_AI_GLOBAL_STANDARD",host:"aiplatform.googleapis.com",location:"global",apiVersion:"v1",model:"gemini-3.7-flash",thinking:"low",maxOutputTokensSingle:512,projectHash:createHash("sha256").update(project).digest("hex").slice(0,12)},logicalTurns:records.length,sessions:sessions.length,responseCounts:counts,remoteSelected:records.filter(record=>record.finalType==="ALEX_REPLY").length,localFallbackSelected:records.filter(record=>record.finalType==="RECOVERY_FALLBACK").length,intentLockRequired:records.filter(record=>record.initialType==="INTENT_LOCK_REQUIRED").length,outOfScope:records.filter(record=>record.finalType==="OUT_OF_SCOPE").length,transportFailure:records.filter(record=>record.finalType==="TRANSPORT_FAILURE"||record.finalType==="CLIENT_ABORT").length,hangingTurns:records.filter(record=>record.aborted).length,latency:{logical:{p50Ms:Number(percentile(latencies,.5).toFixed(2)),p95Ms:Number(percentile(latencies,.95).toFixed(2)),maxMs:Number(Math.max(...latencies).toFixed(2))},initialRequest:{p50Ms:Number(percentile(initialLatencies,.5).toFixed(2)),p95Ms:Number(percentile(initialLatencies,.95).toFixed(2)),maxMs:Number(Math.max(...initialLatencies).toFixed(2))}},retries:{router:telemetryEvents.reduce((sum,event)=>sum+event.routerRetries,0),selectorTransport:telemetryEvents.reduce((sum,event)=>sum+event.selectorTransportRetries,0),selectorStructural:telemetryEvents.reduce((sum,event)=>sum+event.selectorStructuralRetries,0)},providerAttempts:attemptKinds,usage:{router:routerUsage,selector:selectorUsage,combined},estimatedCostUsd:Number(estimatedCostUsd.toFixed(6)),records};
mkdirSync(resolve("results"),{recursive:true});
writeFileSync(resolve("results/vertex-smoke.json"),`${JSON.stringify(result,null,2)}\n`);
process.stdout.write(`${JSON.stringify({...result,records:undefined},null,2)}\n`);
