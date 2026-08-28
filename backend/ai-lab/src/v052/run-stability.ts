import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { V052ApiClient } from "./api-client.js";
import { routeBatch } from "./router.js";
const key=process.env.GEMINI_API_KEY?.trim(),model=process.env.GEMINI_MODEL?.trim()||"gemini-3.7-flash"; if(!key||key==="COLE_SUA_CHAVE_AQUI")throw new Error("Configure GEMINI_API_KEY only in ai-lab/.env");
const data=JSON.parse(await readFile(resolve("results/v052/blind-dataset.json"),"utf8")), h=(s:string)=>createHash("sha256").update(`v052-stability:${s}`).digest("hex");
const sample=data.cases.sort((a:any,b:any)=>h(a.id).localeCompare(h(b.id))).slice(0,200), jobs=[1,2].flatMap(repeat=>Array.from({length:40},(_,batch)=>({repeat,batch,rows:sample.slice(batch*5,batch*5+5)})));
const outDir=resolve("results/v052/stability-batches");await mkdir(outDir,{recursive:true});const client=new V052ApiClient(key,model);let cursor=0,done=0;
async function worker(){for(;;){const index=cursor++;if(index>=jobs.length)return;const job=jobs[index]!,file=resolve(outDir,`R${job.repeat}_${String(job.batch+1).padStart(3,"0")}.json`);try{await readFile(file);done++;continue}catch{}const inputs=job.rows.map((x:any)=>({id:`${x.id}__repeat${job.repeat+1}`,locale:x.locale,text:x.text}));try{const result=await routeBatch(client,"router_stability",`stability_r${job.repeat+1}_${job.batch+1}`,inputs);await writeFile(file,`${JSON.stringify({schemaVersion:"v052-stability-batch-1",repeat:job.repeat+1,batch:job.batch,sourceIds:job.rows.map((x:any)=>x.id),...result},null,2)}\n`)}catch(error){await writeFile(file,`${JSON.stringify({schemaVersion:"v052-stability-batch-1",repeat:job.repeat+1,batch:job.batch,sourceIds:job.rows.map((x:any)=>x.id),routes:[],failure:String((error as Error).message)},null,2)}\n`)}done++;if(done%10===0)process.stdout.write(`stability ${done}/${jobs.length}\n`)}}
await Promise.all(Array.from({length:4},worker));process.stdout.write("V052_STABILITY_COMPLETE 200x3\n");
