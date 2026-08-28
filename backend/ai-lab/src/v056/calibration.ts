import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { INTENT_BANKS } from "../v05/evaluation-data.js";
import { SELECTOR_SPECS,caseSkeleton } from "./dataset-plan.js";
import type { SelectorCase } from "./contracts.js";
import { runCases,summarize } from "./run-common.js";

const cases:SelectorCase[]=[];let index=0;for(const spec of SELECTOR_SPECS){const bank=INTENT_BANKS.find(b=>b.intent===spec.legacyIntent);const en=bank?.en??(spec.category==="OUT_OF_SCOPE"?["What is the capital of France?","Write me a pancake recipe.","Who won the game last night?"]: ["Can you help me with this?"]),pt=bank?.pt??(spec.category==="OUT_OF_SCOPE"?["Qual é a capital da França?","Me passa uma receita de panqueca.","Quem ganhou o jogo ontem?"]: ["Você pode me ajudar com isso?"]);for(let i=0;i<10;i++)for(const locale of ["en-US","pt-BR"] as const){const texts=locale==="en-US"?en:pt;const item=caseSkeleton(spec,locale,index++,texts[i%texts.length]!);item.id=`CAL_${String(index).padStart(4,"0")}`;cases.push(item);}}
await mkdir(resolve("results/v056"),{recursive:true});await writeFile(resolve("results/v056/calibration-set.json"),`${JSON.stringify({schemaVersion:"v056-calibration-set-1",knownHistoricalSurfaces:true,cases},null,2)}\n`);
const records=await runCases({cases,batchSize:5,concurrency:3,prefix:"V056_CAL",output:"results/v056/calibration-routes.json"});const summary=summarize(records);await writeFile(resolve("results/v056/calibration-summary.json"),`${JSON.stringify(summary,null,2)}\n`);process.stdout.write(`${JSON.stringify(summary,null,2)}\n`);
