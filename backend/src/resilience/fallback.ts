import{planById}from"../frozen.js";import type{ConversationState,ResponsePlan}from"../frozen.js";
const escalationPenalty=(plan:ResponsePlan,state:ConversationState)=>plan.effects.tension==="INCREASE"?state.tension==="HIGH"?1000:200:0;
export function selectLocalFallback(candidates:ResponsePlan[],state:ConversationState):ResponsePlan{if(!candidates.length)throw new Error("NO_SAFE_CANDIDATE");return[...candidates].sort((a,b)=>(b.fallbackPriority-escalationPenalty(b,state))-(a.fallbackPriority-escalationPenalty(a,state))||a.id.localeCompare(b.id))[0]!;}
export function assertCandidate(planId:string,candidates:ResponsePlan[]){const plan=planById(planId);if(!plan||!candidates.some(p=>p.id===planId))throw new Error("INVALID_OR_UNSAFE_PLAN");return plan;}

