import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { RESPONSE_PLANS } from "../v05/catalog.js";
import { SELECTOR_CONFIG_V056,SELECTOR_SYSTEM_PROMPT_V056,frozenCandidateDescriptions,selectorSchema } from "./config.js";
import { captureFoundation,hashFiles } from "./foundation.js";
const sha=(v:string)=>createHash("sha256").update(v).digest("hex"),descriptions=frozenCandidateDescriptions(RESPONSE_PLANS),schema=selectorSchema(RESPONSE_PLANS.map(p=>p.id),["CASE_ID"]),foundation=await captureFoundation();
const freeze={schemaVersion:"v056-selector-freeze-1",createdAt:new Date().toISOString(),model:"gemini-3.7-flash",promptHash:sha(SELECTOR_SYSTEM_PROMPT_V056),schemaHash:sha(JSON.stringify(schema)),candidateDescriptionHash:sha(JSON.stringify(descriptions)),modelConfigHash:sha(JSON.stringify(SELECTOR_CONFIG_V056)),sourceHash:await hashFiles(["src/v056/config.ts","src/v056/selector.ts","src/v056/contracts.ts"]),foundation,config:SELECTOR_CONFIG_V056};await mkdir(resolve("results/v056"),{recursive:true});await writeFile(resolve("results/v056/selector-freeze.json"),`${JSON.stringify(freeze,null,2)}\n`);process.stdout.write(`${JSON.stringify(freeze,null,2)}\n`);
