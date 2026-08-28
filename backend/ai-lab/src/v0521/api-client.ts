import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GeminiStructuredClient, type StructuredCall, type StructuredCallResult } from "../gemini/client.js";

export const V0521_HARD_CALL_LIMIT = 2500;
const ledgerFile = resolve("results/v0521/api-call-ledger.json");

export type V0521Stage =
  | "calibration"
  | "blind_generation"
  | "blind_routing"
  | "stability"
  | "runtime_latency"
  | "qa";

type Entry = { sequence: number; stage: V0521Stage; id: string; at: string; transportRetry: number };
type Ledger = { schemaVersion: string; limit: number; count: number; entries: Entry[] };
export type TransportAttempt = {
  attempt: number;
  latencyMs: number;
  outcome: "SUCCESS" | "ERROR";
  errorClass?: "ECONNRESET" | "HTTP_500" | "CAPACITY" | "TIMEOUT" | "OTHER";
};
let chain = Promise.resolve();

async function readLedger(): Promise<Ledger> {
  try {
    return JSON.parse(await readFile(ledgerFile, "utf8"));
  } catch {
    return { schemaVersion: "v0521-call-ledger-1", limit: V0521_HARD_CALL_LIMIT, count: 0, entries: [] };
  }
}

async function reserve(stage: V0521Stage, id: string, transportRetry: number) {
  let sequence = 0;
  chain = chain.then(async () => {
    const ledger = await readLedger();
    if (ledger.count >= V0521_HARD_CALL_LIMIT)
      throw new Error(`V0521_HARD_CALL_LIMIT:${V0521_HARD_CALL_LIMIT}`);
    sequence = ++ledger.count;
    ledger.entries.push({ sequence, stage, id, at: new Date().toISOString(), transportRetry });
    await mkdir(resolve("results/v0521"), { recursive: true });
    await writeFile(ledgerFile, `${JSON.stringify(ledger, null, 2)}\n`);
  });
  await chain;
  return sequence;
}

export class V0521ApiClient {
  private readonly client: GeminiStructuredClient;
  constructor(apiKey: string, model: string) {
    this.client = new GeminiStructuredClient(apiKey, model);
  }

  async call(
    stage: V0521Stage,
    id: string,
    request: StructuredCall,
  ): Promise<StructuredCallResult & {
    sequence: number;
    transportRetries: number;
    attempts: TransportAttempt[];
    fullLatencyMs: number;
  }> {
    let last: unknown;
    const attempts: TransportAttempt[] = [];
    const fullStarted = performance.now();
    for (let attempt = 0; attempt < 8; attempt++) {
      const sequence = await reserve(stage, id, attempt);
      const attemptStarted = performance.now();
      try {
        const result = await this.client.call(request);
        attempts.push({ attempt, latencyMs: performance.now() - attemptStarted, outcome: "SUCCESS" });
        return {
          ...result,
          sequence,
          transportRetries: attempt,
          attempts,
          fullLatencyMs: performance.now() - fullStarted,
        };
      } catch (error) {
        last = error;
        const message = String((error as Error)?.message ?? error);
        const errorClass: TransportAttempt["errorClass"] = /ECONNRESET|fetch failed/i.test(message)
          ? "ECONNRESET"
          : /high demand|capacity|503/i.test(message)
            ? "CAPACITY"
            : /timed out|Timeout/i.test(message)
              ? "TIMEOUT"
              : /InternalServerError|500/i.test(message)
                ? "HTTP_500"
                : "OTHER";
        attempts.push({ attempt, latencyMs: performance.now() - attemptStarted, outcome: "ERROR", errorClass });
        if (attempt === 7 || !/high demand|fetch failed|ECONNRESET|timed out|Timeout|InternalServerError|500|503/i.test(message))
          throw error;
        await new Promise((done) => setTimeout(done, [3_000, 6_000, 12_000, 24_000, 45_000][attempt] ?? 60_000));
      }
    }
    throw last;
  }
}

export async function v0521CallLedger() {
  return readLedger();
}
