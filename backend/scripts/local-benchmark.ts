import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { FAMILY_BY_INTENT } from "../src/frozen.js";
import type { RouterPort, SelectorPort } from "../src/domain/contracts.js";
import { InMemorySessionStore } from "../src/sessions/store.js";
import { SelectorCircuitBreaker } from "../src/resilience/circuit-breaker.js";
import { InMemoryTelemetry } from "../src/telemetry/telemetry.js";
import { TurnOrchestrator } from "../src/orchestration/turn-orchestrator.js";

const router:RouterPort={async route(){return{envelope:{primaryIntent:"ASK_STATUS",alternativeIntent:null,ambiguityType:"NONE",secondaryIntents:[],intentFamily:(FAMILY_BY_INTENT as any).ASK_STATUS,speechAct:"QUESTION",stance:"NEUTRAL",tone:"DIRECT",target:"UNFINISHED_WORK",userClaimCandidates:[],references:[],metaAttack:false,outOfScope:false,confidence:"HIGH",ambiguous:false},latencyMs:0,retries:0,usage:{inputTokens:0,outputTokens:0,thinkingTokens:0,totalTokens:0}};}};
const selector:SelectorPort={async select(input){return{planId:input.candidates[0]!.id,confidence:"HIGH",latencyMs:0,transportRetries:0,structuralRetries:0,attempts:[{attempt:1,kind:"SUCCESS",httpStatus:200,latencyMs:0,finishReason:"STOP"}],usage:{inputTokens:0,outputTokens:0,thinkingTokens:0,totalTokens:0}};}};
const percentile=(values:number[],q:number)=>values.slice().sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(q*values.length))]??0;
const sessions=new InMemorySessionStore(),telemetry=new InMemoryTelemetry(),orchestrator=new TurnOrchestrator(sessions,router,selector,new SelectorCircuitBreaker(),telemetry),samples:number[]=[];
for(let index=0;index<1_000;index++){
  const session=orchestrator.createSession(index%2?"pt-BR":"en-US"),started=performance.now();
  await orchestrator.submitTurn(session.sessionId,{text:index%2?"O que falta?":"What is still missing?",clientTurnId:`benchmark-${index}`});
  samples.push(performance.now()-started);
}
const result={schemaVersion:"backend-v06-local-benchmark-1",createdAt:new Date().toISOString(),requests:samples.length,p50Ms:Number(percentile(samples,.5).toFixed(3)),p95Ms:Number(percentile(samples,.95).toFixed(3)),maxMs:Number(Math.max(...samples).toFixed(3)),hangingTurns:0};
mkdirSync(resolve("results"),{recursive:true});
writeFileSync(resolve("results/local-benchmark.json"),`${JSON.stringify(result,null,2)}\n`);
process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
