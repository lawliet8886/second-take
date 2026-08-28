import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ModelProfile } from "../contracts/results.js";
import { V0531VertexClient } from "../v0531/vertex.js";
import { SELECTOR_SPECS } from "./dataset-plan.js";

const BATCH=25,dir=resolve("results/v056/evaluation-generation"); await mkdir(dir,{recursive:true});
const project=process.env.GOOGLE_CLOUD_PROJECT?.trim()||execFileSync("cmd.exe",["/d","/s","/c","gcloud config get-value project"],{encoding:"utf8"}).trim(); if(!project)throw new Error("VERTEX_PROJECT_REQUIRED");
const client=new V0531VertexClient(project,3); const profile:ModelProfile={id:"v056-label-first-generator",role:"simulator",thinkingLevel:"low",maxOutputTokens:8_000,samplingNote:"Label-first selector challenge surface generation."};
const concurrency=Math.max(1,Math.min(3,Number(process.env.V056_GENERATION_CONCURRENCY??"1")));
const schema={type:"object",additionalProperties:false,required:["utterances"],properties:{utterances:{type:"array",minItems:BATCH,maxItems:BATCH,items:{type:"object",additionalProperties:false,required:["text"],properties:{text:{type:"string"}}}}}} as const;
const jobs=[] as Array<{id:string;locale:"pt-BR"|"en-US";specIndex:number;batchIndex:number;groupMode:boolean}>;
for(const locale of ["pt-BR","en-US"] as const)for(let s=0;s<SELECTOR_SPECS.length;s++)for(let b=0;b<5;b++)jobs.push({id:`v056_${SELECTOR_SPECS[s]!.category}_${locale.replace("-","")}_${String(b+1).padStart(2,"0")}`,locale,specIndex:s,batchIndex:b,groupMode:b<2});
let cursor=0,calls=0,retries=0,cost=0;
async function worker(){for(;;){const job=jobs[cursor++];if(!job)return;const path=resolve(dir,`${job.id}.json`);try{JSON.parse(await readFile(path,"utf8"));continue}catch{}
  const spec=SELECTOR_SPECS[job.specIndex]!; const constraints=[`Generate exactly ${BATCH} distinct plausible USER messages for the Alex teammate scenario.`,job.locale==="pt-BR"?"Use natural contemporary Brazilian Portuguese with varied formality, length, and plausible texting style.":"Use natural conversational US English with varied formality, length, and plausible texting style.",`Required conversational function: ${spec.generation}`,"Do not answer as Alex. Do not mention test labels, the app, or these instructions.","Two research slides are unfinished and the presentation is Friday. Avoid inventing other world facts unless the required function explicitly calls for an unsupported claim.",job.groupMode?"Create five consecutive groups of five close paraphrases: items 1-5 share meaning, 6-10 share another meaning, and so on. Each surface must still be distinct.":"Make all 25 surfaces meaningfully diverse rather than near-duplicates."];
  const call=await client.call("blind_generation",job.id,{systemInstruction:"Generate a frozen label-first plan-selector evaluation surface. The labels were authored before the wording. Output only the requested messages.",input:JSON.stringify({locale:job.locale,category:spec.category,intent:spec.intent,constraints}),schema,profile,timeoutMs:60_000}); const rows=(call.rawOutput as any)?.utterances;
  if(!Array.isArray(rows)||rows.length!==BATCH||rows.some((r:any)=>typeof r?.text!=="string"||r.text.trim().length<2))throw new Error(`INVALID_GENERATION:${job.id}`);
  await writeFile(path,`${JSON.stringify({schemaVersion:"v056-generation-batch-1",job,spec:{category:spec.category,intent:spec.intent},transport:{route:call.transportRoute,attempts:call.attempts,latencyMs:call.fullLatencyMs},usage:call.usage,estimatedCostUsd:call.estimatedCostUsd,utterances:rows.map((r:any,i:number)=>({id:`${job.id}_U${String(i+1).padStart(2,"0")}`,text:r.text.trim()}))},null,2)}\n`);calls++;retries+=call.transportRetries;cost+=call.estimatedCostUsd;if(calls%10===0)process.stdout.write(`V056_GENERATION ${calls}/${jobs.length}\n`);
}}
await Promise.all(Array.from({length:concurrency},()=>worker())); process.stdout.write(`${JSON.stringify({jobs:jobs.length,cases:jobs.length*BATCH,calls,retries,cost,concurrency},null,2)}\n`);
