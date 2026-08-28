import type{TelemetrySink,TurnTelemetry}from"../domain/contracts.js";
export class InMemoryTelemetry implements TelemetrySink{readonly events:TurnTelemetry[]=[];record(event:TurnTelemetry){this.events.push(structuredClone(event));}}
export class SanitizedConsoleTelemetry implements TelemetrySink{constructor(private readonly includeContent=false){}record(event:TurnTelemetry){const safe={...event,stateBefore:{...event.stateBefore,variantHistory:[]},stateAfter:event.stateAfter?{...event.stateAfter,variantHistory:[]}:null};void this.includeContent;process.stdout.write(`${JSON.stringify({event:"turn",...safe})}\n`);}}

