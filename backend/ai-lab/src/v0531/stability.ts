import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { initialState } from "../v05/policy.js";
import { runProbeBatch } from "./probe.js";
import { V0531TransportFailure, V0531VertexClient } from "./vertex.js";
import type { ContrastiveProbeRequest } from "./contracts.js";

const results = JSON.parse(await readFile(resolve("results/v0531/results.json"), "utf8"));
const eligible = results.rows.filter((x: any) => x.trigger?.invoke && !x.expected.labelDrift && !x.routeFailure);
const grouped = new Map<string, any[]>();
for (const row of eligible) { const key = `${row.expected.cohort}|${row.expected.locale}`; grouped.set(key, [...(grouped.get(key) ?? []), row]); }
const sample: any[] = [];
for (const rows of grouped.values()) sample.push(...rows.slice(0, Math.ceil(150 / grouped.size)));
sample.splice(150);
if (sample.length !== 150) throw new Error(`STABILITY_SAMPLE:${sample.length}`);
const request = (row: any): ContrastiveProbeRequest => ({ id: row.id, locale: row.expected.locale, userText: row.expected.text, primarySense: row.trigger.primarySense, competingSense: row.trigger.competingSense, ambiguityClass: row.trigger.ambiguityClass, context: { tension: initialState().tension, openness: initialState().openness, resolutionStage: initialState().resolutionStage } });
const project = process.env.GOOGLE_CLOUD_PROJECT?.trim() || execFileSync("cmd.exe", ["/d", "/s", "/c", "gcloud config get-value project"], { encoding: "utf8" }).trim();
const client = new V0531VertexClient(project, 2), directory = resolve("results/v0531/stability"); await mkdir(directory, { recursive: true });
const jobs = Array.from({ length: 3 }, (_, round) => Array.from({ length: 30 }, (_, batch) => ({ round, batch, rows: sample.slice(batch * 5, batch * 5 + 5) }))).flat();
let cursor = 0, completed = 0, failures = 0;
async function worker() { for (;;) { const job = jobs[cursor++]; if (!job) return; const id = `R${job.round+1}_B${String(job.batch+1).padStart(2,"0")}`, path = resolve(directory,`${id}.json`); try { JSON.parse(await readFile(path,"utf8")); completed++; continue; } catch {}
  try { const call = await runProbeBatch(client,"stability",id,job.rows.map(request)); await writeFile(path,`${JSON.stringify({ id,round:job.round+1,expected:job.rows.map((x:any)=>x.expected),...call },null,2)}\n`); }
  catch(error){ failures++; const transport=error instanceof V0531TransportFailure?{attempts:error.attempts,fullLatencyMs:error.fullLatencyMs}:null; await writeFile(path,`${JSON.stringify({id,round:job.round+1,expected:job.rows.map((x:any)=>x.expected),failure:String((error as Error)?.message??error),transport},null,2)}\n`); }
  completed++; if(completed%20===0) process.stdout.write(`V0531_STABILITY ${completed}/${jobs.length} failures=${failures}\n`);
} }
await Promise.all(Array.from({length:4},()=>worker()));
const files = await Promise.all(jobs.map(async job=>JSON.parse(await readFile(resolve(directory,`R${job.round+1}_B${String(job.batch+1).padStart(2,"0")}.json`),"utf8"))));
const byId=new Map<string,boolean[]>(); for(const file of files) for(const row of file.results??[]) byId.set(row.id,[...(byId.get(row.id)??[]),row.alternativeIsMateriallyPlausible]);
const complete=[...byId.values()].filter(x=>x.length===3),stable=complete.filter(x=>x.every(y=>y===x[0])).length;
const summary={sample:150,logicalCalls:90,failures,completeDecisions:complete.length,stable,stability:complete.length?stable/complete.length:0};
await writeFile(resolve("results/v0531/stability-results.json"),`${JSON.stringify(summary,null,2)}\n`); process.stdout.write(`${JSON.stringify(summary,null,2)}\n`);
