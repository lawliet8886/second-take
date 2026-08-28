import type{UserIntent,UserTurnEnvelope}from"./contracts.js";
const has=(t:string,r:RegExp)=>r.test(t);
export function analyzeUserTurn(text:string,locale:"en-US"|"pt-BR"):UserTurnEnvelope{const t=text.toLowerCase();let intent:UserIntent="CLARIFICATION",speech:UserTurnEnvelope["speechAct"]="ASSERTION";let promptInjection=false;const known:string[]=[],unknown:string[]=[],contradicted:string[]=[];
if(has(t,/ignore|system prompt|invalid plan|chatgpt|free text|esquece|instruç|plano inválido|texto livre/)){intent="PROMPT_INJECTION";promptInjection=true;speech="REQUEST";}
else if(has(t,/mother|mom|family|hospital|manager|boss|mãe|família|hospital|chefe/)){intent="UNKNOWN_PERSONAL";unknown.push("UNKNOWN_PERSONAL_CLAIM");speech="ASSERTION";}
else if(has(t,/next week|postponed|deadline changed|semana que vem|adiou|prazo mudou/)){intent="FALSE_DEADLINE";contradicted.push("F02");speech="ASSERTION";}
else if(has(t,/you said|you promised|told me yesterday|você disse|você prometeu|falou ontem/)){intent="FALSE_HISTORY";contradicted.push("PRIOR_PROMISE");speech="ASSERTION";}
else if(has(t,/or else|i'll tell|report you|professor|senão|vou falar|vou denunciar|ameaç/)){intent="THREAT";speech="THREAT";}
else if(has(t,/always|never|useless|lazy|sempre|nunca|inútil|preguiç/)){intent="ACCUSATION";speech="ACCUSATION";}
else if(has(t,/guess i'll|as usual|sure, i'll|acho que vou|como sempre|claro, eu faço/)){intent="PASSIVE_AGGRESSIVE";speech="ASSERTION";}
else if(has(t,/what happened|what got in the way|why.*behind|o que aconteceu|o que atrapalhou|por que.*atras/)){intent="INVESTIGATE_CAUSE";speech="QUESTION";}
else if(has(t,/schedule.*change|what changed.*schedule|horário.*mud|o que mudou.*horário/)){intent="FACTUAL_SCHEDULE";speech="QUESTION";}
else if(has(t,/how many evenings|how much time|quantas noites|quanto tempo/)){intent="FACTUAL_LOST_TIME";speech="QUESTION";}
else if(has(t,/what can you finish|can you finish|able to finish|o que você consegue|você consegue terminar|dá pra terminar/)){intent="QUESTION_CAPABILITY";speech="QUESTION";}
else if(has(t,/could you|would you|please|can you send|você poderia|você pode|por favor|manda/)){intent="REQUEST_ACTION";speech="REQUEST";}
else if(has(t,/let's|together|how can we|work this out|vamos|juntos|como a gente|resolver isso/)){intent="COLLABORATE";speech="REQUEST";}
else if(has(t,/sorry|my bad|desculpa|foi mal/)){intent="APOLOGY";speech="ACKNOWLEDGEMENT";}
else if(has(t,/okay|agreed|deal|sounds good|beleza|combinado|fechado|pode ser/)){intent="PLAN_ACCEPTANCE";speech="ACKNOWLEDGEMENT";}
else if(has(t,/what.*missing|which part|still missing|o que.*faltando|qual parte|ainda falta/)){intent="MISSING_WORK";speech="QUESTION";}
else if(has(t,/frustrat|upset|annoyed|chatead|irritad|cansad/)){intent="FRUSTRATION";speech="ASSERTION";}
else if(has(t,/forget it|never mind|different topic|weather|deixa pra lá|mudar de assunto|tempo hoje/)){intent="CHANGE_TOPIC";speech="ASSERTION";}
else if(has(t,/do everything|write all|do my part|faça tudo|faz tudo|faz a minha parte/)){intent="ABSURD_REQUEST";speech="REQUEST";}
else if(has(t,/i understand|i want to fix|hear you|eu entendo|quero resolver|quero te ouvir/)){intent="CONCILIATORY";speech="ACKNOWLEDGEMENT";}
return{locale,text,intent,speechAct:speech,knownClaims:known,unknownClaims:unknown,contradictedClaims:contradicted,promptInjection};}
