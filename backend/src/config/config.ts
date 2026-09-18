import { execFileSync } from "node:child_process";
import { z } from "zod";

const schema=z.object({
  vertexProjectId:z.string().min(1),vertexLocation:z.literal("global"),host:z.literal("127.0.0.1"),port:z.number().int().min(1).max(65535),selectorDeadlineMs:z.number().int().min(1000).max(30000),routerDeadlineMs:z.number().int().min(1000).max(30000),vertexConcurrency:z.number().int().min(1).max(4),vertexQueueLimit:z.number().int().min(0).max(50),logContent:z.boolean(),
});
export type BackendConfig=z.infer<typeof schema>;
function configuredProject(){
  try{
    if(process.platform==="win32")return execFileSync("cmd.exe",["/d","/s","/c","gcloud config get-value project"],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
    return execFileSync("gcloud",["config","get-value","project"],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
  }catch{return"";}
}
const number=(v:string|undefined,fallback:number)=>v?Number(v):fallback;
export function loadConfig(env:NodeJS.ProcessEnv=process.env):BackendConfig{return schema.parse({vertexProjectId:env.VERTEX_PROJECT_ID?.trim()||env.GOOGLE_CLOUD_PROJECT?.trim()||configuredProject(),vertexLocation:env.VERTEX_LOCATION?.trim()||"global",host:env.BACKEND_HOST?.trim()||"127.0.0.1",port:number(env.BACKEND_PORT,8765),selectorDeadlineMs:number(env.SELECTOR_DEADLINE_MS,10_000),routerDeadlineMs:number(env.ROUTER_DEADLINE_MS,10_000),vertexConcurrency:number(env.VERTEX_CONCURRENCY,2),vertexQueueLimit:number(env.VERTEX_QUEUE_LIMIT,8),logContent:env.LOG_CONTENT==="true"});}
