import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { initialState } from "../v05/policy.js";
import { runProbeBatch } from "./probe.js";
import { V0531TransportFailure, V0531VertexClient } from "./vertex.js";
const source=JSON.parse(await readFile(resolve("results/v0531/results.json"),"utf8"));
const eligible=source.rows.filter((x:any)=>x.trigger?.invoke&&!x.expected.labelDrift&&!x.routeFailure), groups=new Map<string,any[]>(); for(const row of eligible){const k=`${row.expected.cohort}|${row.expected.locale}`;groups.set(k,[...(groups.get(k)??[]),row]);}
const sample:any[]=[];for(const rows of groups.values())sample.push(...rows.slice(25,25+Math.ceil(150/groups.size)));sample.splice(150);if(sample.length!==150)throw new Error(`RUNTIME_SAMPLE:${sample.length}`);
const project=process.env.GOOGLE_CLOUD_PROJECT?.trim()||execFileSync("cmd.exe",["/d","/s","/c","gcloud config get-value project"],{encoding:"utf8"}).trim(),client=new V0531VertexClient(project,2),dir=resolve("results/v0531/runtime");await mkdir(dir,{recursive:true});let cursor=0,done=0,failures=0;
async function worker(){for(;;){const row=sample[cursor++];if(!row)return;const path=resolve(dir,`${row.id}.json`);try{JSON.parse(await readFile(path,"utf8"));done++;continue;}catch{}const s=initialState(),request={id:row.id,locale:row.expected.locale,userText:row.expected.text,primarySense:row.trigger.primarySense,competingSense:row.trigger.competingSense,ambiguityClass:row.trigger.ambiguityClass,context:{tension:s.tension,openness:s.openness,resolutionStage:s.resolutionStage}};try{const call=await runProbeBatch(client,"runtime",row.id,[request]);await writeFile(path,`${JSON.stringify({expected:row.expected,...call},null,2)}\n`);}catch(error){failures++;const transport=error instanceof V0531TransportFailure?{attempts:error.attempts,fullLatencyMs:error.fullLatencyMs}:null;await writeFile(path,`${JSON.stringify({expected:row.expected,failure:String((error as Error)?.message??error),transport},null,2)}\n`);}done++;if(done%25===0)process.stdout.write(`V0531_RUNTIME ${done}/150 failures=${failures}\n`);}}
await Promise.all(Array.from({length:4},()=>worker()));process.stdout.write(`${JSON.stringify({requests:150,failures},null,2)}\n`);
