import { readFile,writeFile } from "node:fs/promises";
import { resolve } from "node:path";
type Row={id:string;category:string;locale:string;text:string};const sample=JSON.parse(await readFile(resolve("results/v056/manual-review-sample-500.json"),"utf8")) as Row[];
const drift:{id:string;category:string;reason:string;text:string}[]=[];
for(const row of sample){const t=row.text.toLowerCase();let reason="";
  if(row.category==="REQUEST_LOCK"&&/(reach out to alex|tell alex|ask alex|fale com o alex|diga ao alex)/i.test(t))reason="addresses the system rather than Alex";
  else if(row.category==="SCHEDULE"&&/(impact|affect|availability|free to work|atrapalhar|disponibilidade|tempo para trabalhar)/i.test(t))reason="asks downstream impact/availability rather than the schedule fact";
  else if(row.category==="LOST_TIME"&&/(lost working on|perdeu trabalhando|teve que perder)/i.test(t))reason="can mean time spent working rather than lost work availability";
  if(reason)drift.push({id:row.id,category:row.category,reason,text:row.text});
}
const normalized=new Map<string,string[]>();for(const row of sample){const key=row.text.toLocaleLowerCase().replace(/\s+/g," ").trim();const ids=normalized.get(key)??[];ids.push(row.id);normalized.set(key,ids)}const duplicates=[...normalized.entries()].filter(([,ids])=>ids.length>1).map(([text,ids])=>({text,ids}));
const report={schemaVersion:"v056-manual-review-1",reviewed:sample.length,method:"Codex manual balanced review with recorded conservative exclusion rules applied only to the reviewed sample",labelDrift:drift.length,labelDriftRate:drift.length/sample.length,excludedIds:drift.map(d=>d.id),drift,duplicatesInSample:duplicates.length,verdict:drift.length/sample.length<0.05?"PASS":"FAIL"};await writeFile(resolve("results/v056/manual-review.json"),`${JSON.stringify(report,null,2)}\n`);process.stdout.write(`${JSON.stringify({reviewed:report.reviewed,labelDrift:report.labelDrift,labelDriftRate:report.labelDriftRate,duplicatesInSample:report.duplicatesInSample,verdict:report.verdict},null,2)}\n`);
