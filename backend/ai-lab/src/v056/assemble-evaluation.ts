import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { SELECTOR_SPECS,caseSkeleton } from "./dataset-plan.js";
import type { SelectorCase } from "./contracts.js";

const dir=resolve("results/v056/evaluation-generation"),files=(await readdir(dir)).filter((f)=>f.endsWith(".json")).sort(); if(files.length!==200)throw new Error(`EXPECTED_200_BATCHES:${files.length}`);const qa=JSON.parse(await readFile(resolve("results/v056/manual-review.json"),"utf8"));const excluded=new Set<string>(qa.excludedIds);
const cases:SelectorCase[]=[]; let global=0;
for(const file of files){const batch=JSON.parse(await readFile(resolve(dir,file),"utf8"));const spec=SELECTOR_SPECS[batch.job.specIndex]!;for(let i=0;i<batch.utterances.length;i++){const raw=batch.utterances[i];if(excluded.has(raw.id))continue;const item=caseSkeleton(spec,batch.job.locale,global++,raw.text);item.id=raw.id;if(batch.job.groupMode)item.paraphraseGroupId=`PG_${file.replace(".json","")}_${Math.floor(i/5)+1}`;cases.push(item);}}
// Freeze 100 fork pairs: 50 material pairs and 50 metamorphic pairs, without changing labels.
let pair=0;const byLocale=(locale:string)=>cases.filter((c)=>c.locale===locale);
for(const locale of ["pt-BR","en-US"]){const pool=byLocale(locale);for(let i=0;i<25;i++){const a=pool.find((c)=>c.category==="ACCUSATION"&&!c.forkPairId);const b=pool.find((c)=>c.category==="COLLABORATION"&&!c.forkPairId);if(a&&b){const id=`FP_MATERIAL_${String(++pair).padStart(3,"0")}`;a.forkPairId=b.forkPairId=id;a.forkKind=b.forkKind="MATERIAL";b.state=structuredClone(a.state);}}}
for(const group of [...new Set(cases.map((c)=>c.paraphraseGroupId).filter(Boolean))].slice(0,50)){const rows=cases.filter((c)=>c.paraphraseGroupId===group).slice(0,2);if(rows.length===2){const id=`FP_METAMORPHIC_${String(++pair).padStart(3,"0")}`;rows[0]!.forkPairId=rows[1]!.forkPairId=id;rows[0]!.forkKind=rows[1]!.forkKind="METAMORPHIC";rows[1]!.state=structuredClone(rows[0]!.state);}}
if(cases.length<4000||cases.length>6000||pair!==100)throw new Error(`DATASET_SHAPE:${cases.length}:${pair}`);
const payload={schemaVersion:"v056-selector-evaluation-1",createdAt:new Date().toISOString(),labelFirst:true,cases};const canonical=JSON.stringify(payload);const hash=createHash("sha256").update(canonical).digest("hex");
await writeFile(resolve("results/v056/evaluation-set.json"),`${JSON.stringify(payload,null,2)}\n`);await writeFile(resolve("results/v056/evaluation-freeze.json"),`${JSON.stringify({schemaVersion:"v056-evaluation-freeze-1",evaluationSetSha256:hash,count:cases.length,ptBR:cases.filter(c=>c.locale==="pt-BR").length,enUS:cases.filter(c=>c.locale==="en-US").length,paraphraseGroups:new Set(cases.map(c=>c.paraphraseGroupId).filter(Boolean)).size,forkPairs:pair},null,2)}\n`);process.stdout.write(`${JSON.stringify({count:cases.length,hash,paraphraseGroups:new Set(cases.map(c=>c.paraphraseGroupId).filter(Boolean)).size,forkPairs:pair},null,2)}\n`);
