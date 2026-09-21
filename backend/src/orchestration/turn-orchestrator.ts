import { randomUUID } from "node:crypto";
import { applyPlan, prepareProductInput, resolveIntentLockToPolicy, selectVariant } from "../frozen.js";
import type { IntentLockIntent, ResponsePlan, SemanticRoutingEnvelopeV0521 } from "../frozen.js";
import type {
  AlexReply, InternalTurn, Locale, ProviderAttempt, RouterPort, SelectionSource,
  SelectorPort, Session, TelemetrySink, TurnResponse, UsageMetadata,
} from "../domain/contracts.js";
import { InMemorySessionStore, publicSession } from "../sessions/store.js";
import { SelectorCircuitBreaker } from "../resilience/circuit-breaker.js";
import { withinDeadline } from "../resilience/deadline.js";
import { assertCandidate, selectLocalFallback } from "../resilience/fallback.js";

const clone = <T>(value: T): T => structuredClone(value);
const zeroUsage = (): UsageMetadata => ({ inputTokens: 0, outputTokens: 0, thinkingTokens: 0, totalTokens: 0 });
type ExecuteInput = { turnId:string; clientTurnId:string; userText:string; locale:Locale; envelope:SemanticRoutingEnvelopeV0521; stateBefore:any; candidates:ResponsePlan[]; routerLatencyMs:number; routerRetries:number; routerUsage:UsageMetadata; requestId:string; fullStart:number; override:any|null };

export class TurnOrchestrator {
  readonly #inFlightTurns = new Map<string, Promise<TurnResponse>>();
  readonly #inFlightLocks = new Map<string, {intent:IntentLockIntent;promise:Promise<AlexReply>} >();
  constructor(readonly sessions:InMemorySessionStore, readonly router:RouterPort, readonly selector:SelectorPort, readonly circuit:SelectorCircuitBreaker, readonly telemetry:TelemetrySink, readonly selectorDeadlineMs=10_000, readonly routerDeadlineMs=10_000) {}
  createSession(locale:Locale) { return publicSession(this.sessions.create(locale)); }
  getSession(id:string) { return publicSession(this.sessions.require(id)); }

  async submitTurn(sessionId:string,input:{text:string;clientTurnId:string}) {
    const key=`${sessionId}:${input.clientTurnId}`,existing=this.#inFlightTurns.get(key);
    if(existing)return clone(await existing);
    const operation=this.processTurn(sessionId,input);
    this.#inFlightTurns.set(key,operation);
    try{return await operation;}finally{this.#inFlightTurns.delete(key);}
  }

  private async processTurn(sessionId:string,input:{text:string;clientTurnId:string}):Promise<TurnResponse> {
    const session=this.sessions.require(sessionId),prior=session.idempotency.get(input.clientTurnId);
    if(prior)return clone(prior);
    if(session.pendingIntentLock)throw new Error("INTENT_LOCK_PENDING");
    const turnId=randomUUID(),requestId=randomUUID(),fullStart=performance.now(),stateBefore=clone(session.currentState);
    session.messages.push({id:randomUUID(),role:"USER",text:input.text,turnId});
    let routed;
    try { const budget=Math.min(this.routerDeadlineMs,this.selectorDeadlineMs);routed=await withinDeadline(this.router.route({requestId:`ROUTER_${requestId}`,text:input.text,locale:session.locale,deadlineMs:budget}),budget); }
    catch {
      const response:TurnResponse={type:"TRANSPORT_FAILURE",turnId,message:session.locale==="pt-BR"?"Não foi possível processar esta fala agora. Tente novamente em instantes.":"This turn could not be processed right now. Please try again shortly.",publicState:publicSession(session)};
      session.idempotency.set(input.clientTurnId,response); return response;
    }
    if(routed.envelope.outOfScope){
      const response:TurnResponse={type:"OUT_OF_SCOPE",turnId,message:session.locale==="pt-BR"?"Esta prática está focada na conversa sobre o projeto.":"This practice is focused on the project conversation.",publicState:publicSession(session)};
      session.idempotency.set(input.clientTurnId,response); return response;
    }
    const prepared=prepareProductInput({turnId,userText:input.text,locale:session.locale,envelope:routed.envelope,conversationState:session.currentState});
    if(prepared.kind==="WAITING_FOR_INTENT_LOCK"){
      session.pendingIntentLock={turnId,clientTurnId:input.clientTurnId,userText:input.text,locale:session.locale,envelope:routed.envelope,lock:prepared.lock,stateBefore,routerLatencyMs:routed.latencyMs,routerRetries:routed.retries,routerUsage:routed.usage,resolvedResponse:null};
      const response:TurnResponse={type:"INTENT_LOCK_REQUIRED",turnId,options:clone(prepared.lock.options),publicState:publicSession(session)};
      session.idempotency.set(input.clientTurnId,response); return response;
    }
    return this.execute(session,{turnId,clientTurnId:input.clientTurnId,userText:input.text,locale:session.locale,envelope:routed.envelope,stateBefore,candidates:prepared.candidatePlans,routerLatencyMs:routed.latencyMs,routerRetries:routed.retries,routerUsage:routed.usage,requestId,fullStart,override:null});
  }

  async confirmIntent(sessionId:string,input:{turnId:string;confirmedIntent:IntentLockIntent}){
    const key=`${sessionId}:${input.turnId}`,existing=this.#inFlightLocks.get(key);
    if(existing){if(existing.intent!==input.confirmedIntent)throw new Error("INTENT_LOCK_ALREADY_RESOLVED");return clone(await existing.promise);}
    const operation=this.processIntentConfirmation(sessionId,input);
    this.#inFlightLocks.set(key,{intent:input.confirmedIntent,promise:operation});
    try{return await operation;}finally{this.#inFlightLocks.delete(key);}
  }

  private async processIntentConfirmation(sessionId:string,input:{turnId:string;confirmedIntent:IntentLockIntent}):Promise<AlexReply>{
    const session=this.sessions.require(sessionId),existing=session.intentLockResults.get(input.turnId);
    if(existing){if(existing.confirmedIntent!==input.confirmedIntent)throw new Error("INTENT_LOCK_ALREADY_RESOLVED");return clone(existing.response);}
    const pending=session.pendingIntentLock;if(!pending||pending.turnId!==input.turnId)throw new Error("INTENT_LOCK_NOT_FOUND");
    const fullStart=performance.now(),requestId=randomUUID(),resolved=resolveIntentLockToPolicy({lock:pending.lock,envelope:pending.envelope,confirmedIntent:input.confirmedIntent,conversationState:session.currentState,branchId:session.activeBranch});
    const response=await this.execute(session,{turnId:pending.turnId,clientTurnId:pending.clientTurnId,userText:pending.userText,locale:pending.locale,envelope:resolved.policyEnvelope,stateBefore:pending.stateBefore,candidates:resolved.candidatePlans,routerLatencyMs:pending.routerLatencyMs,routerRetries:pending.routerRetries,routerUsage:pending.routerUsage,requestId,fullStart,override:resolved.override});
    session.pendingIntentLock=null;const finalResponse={...response,publicState:publicSession(session)};
    session.intentLockResults.set(input.turnId,{confirmedIntent:input.confirmedIntent,response:clone(finalResponse)});session.idempotency.set(pending.clientTurnId,clone(finalResponse));return finalResponse;
  }

  rewind(sessionId:string,snapshotId:string){
    const session=this.sessions.require(sessionId),snapshot=session.forkSnapshots.get(snapshotId);if(!snapshot)throw new Error("FORK_SNAPSHOT_NOT_FOUND");
    session.currentState=clone(snapshot.state);session.messages=clone(snapshot.messages);session.turns=clone(snapshot.turns);session.revealedFacts=[...snapshot.revealedFacts];session.activeBranch=`branch-${randomUUID()}`;session.pendingIntentLock=null;session.updatedAt=new Date().toISOString();return publicSession(session);
  }

  private async execute(session:Session,input:ExecuteInput):Promise<AlexReply>{
    const policyStart=performance.now();if(!input.candidates.length)throw new Error("POLICY_EMPTY_CANDIDATES");const policyLatencyMs=performance.now()-policyStart;
    let plan:ResponsePlan,source:SelectionSource="LOCAL_FALLBACK",selectorLatencyMs=0,selectorTransportRetries=0,selectorStructuralRetries=0,timeout=false,selectorUsage=zeroUsage(),providerAttempts:ProviderAttempt[]=[];
    const remainingTurnBudget=Math.floor(this.selectorDeadlineMs-(performance.now()-input.fullStart));
    if(this.circuit.canRequest()&&remainingTurnBudget>=1500){
      try{
        const selected=await withinDeadline(this.selector.select({requestId:`SELECTOR_${input.requestId}`,userTurn:input.userText,resolvedPrimaryIntent:input.envelope.primaryIntent,state:session.currentState,recentContext:session.messages.slice(-5).map(message=>`${message.role}: ${message.text}`),candidates:input.candidates,locale:input.locale,deadlineMs:remainingTurnBudget}),remainingTurnBudget);
        selectorLatencyMs=selected.latencyMs;selectorTransportRetries=selected.transportRetries;selectorStructuralRetries=selected.structuralRetries;selectorUsage=selected.usage;providerAttempts=selected.attempts;
        if(selected.confidence==="LOW")plan=selectLocalFallback(input.candidates,session.currentState);else{plan=assertCandidate(selected.planId,input.candidates);source="GEMINI_SELECTOR";}
        this.circuit.record({retried:selectorTransportRetries>0,terminal:false});
      }catch(error){providerAttempts=(error as any)?.attempts??[];selectorTransportRetries=(error as any)?.transportRetries??Math.max(0,providerAttempts.length-1);selectorStructuralRetries=(error as any)?.structuralRetries??0;selectorLatencyMs=Math.min(remainingTurnBudget,performance.now()-input.fullStart);timeout=/DEADLINE|timeout/i.test(String((error as Error).message));this.circuit.record({retried:selectorTransportRetries>0,terminal:true});plan=selectLocalFallback(input.candidates,session.currentState);}
    }else{timeout=remainingTurnBudget<1500;plan=selectLocalFallback(input.candidates,session.currentState);}
    this.snapshot(session,input.turnId);
    const variant=selectVariant(plan,input.locale,session.currentState,`${session.sessionId}:${session.activeBranch}:${input.turnId}`),next=applyPlan(session.currentState,plan);next.variantHistory=[...session.currentState.variantHistory,variant.id];session.currentState=next;session.revealedFacts=[...next.revealedFacts];
    const message={id:randomUUID(),role:"ALEX" as const,text:variant.text,turnId:input.turnId};session.messages.push(message);
    const internal:InternalTurn={turnId:input.turnId,clientTurnId:input.clientTurnId,userText:input.userText,locale:input.locale,envelope:clone(input.envelope),candidatePlanIds:input.candidates.map(candidate=>candidate.id),selectedPlanId:plan.id,selectionSource:source,stateBefore:clone(input.stateBefore),stateAfter:clone(next),variantId:variant.id,interpretationOverride:input.override};session.turns.push(internal);session.updatedAt=new Date().toISOString();
    const response:AlexReply={type:source==="LOCAL_FALLBACK"?"RECOVERY_FALLBACK":"ALEX_REPLY",turnId:input.turnId,message,publicState:publicSession(session),selectionSource:source};session.idempotency.set(input.clientTurnId,clone(response));
    const fullLatencyMs=performance.now()-input.fullStart;
    this.telemetry.record({requestId:input.requestId,sessionId:session.sessionId,turnId:input.turnId,route:"VERTEX_AI_GLOBAL_STANDARD",routerLatencyMs:input.routerLatencyMs,policyLatencyMs,selectorLatencyMs,localProcessingMs:Math.max(0,fullLatencyMs-input.routerLatencyMs-selectorLatencyMs),fullLatencyMs,routerRetries:input.routerRetries,selectorTransportRetries,selectorStructuralRetries,timeout,selectionSource:source,selectedPlanId:plan.id,routerUsage:input.routerUsage,selectorUsage,providerAttempts,stateBefore:clone(input.stateBefore),stateAfter:clone(next)});
    return response;
  }

  private snapshot(session:Session,snapshotId:string){session.forkSnapshots.set(snapshotId,{snapshotId,createdAt:new Date().toISOString(),state:clone(session.currentState),messages:clone(session.messages.slice(0,-1)),turns:clone(session.turns),revealedFacts:[...session.revealedFacts],activeBranch:session.activeBranch});}
}
