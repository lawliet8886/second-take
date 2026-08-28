import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GeminiStructuredClient, type StructuredCall, type StructuredCallResult } from "../gemini/client.js";

const LIMIT = 3000;
const ledgerFile = resolve("results/v052/api-call-ledger.json");
export type V052Stage = "dataset_generation" | "router_calibration" | "router_blind" | "router_stability" | "qa";
type Entry = { sequence: number; stage: V052Stage; id: string; at: string; transportRetry: number };
type Ledger = { schemaVersion: string; limit: number; count: number; entries: Entry[] };
let chain = Promise.resolve();

async function readLedger(): Promise<Ledger> {
  try {
    return JSON.parse(await readFile(ledgerFile, "utf8"));
  } catch {
    return { schemaVersion: "v052-call-ledger-1", limit: LIMIT, count: 0, entries: [] };
  }
}
async function reserve(stage: V052Stage, id: string, transportRetry: number) {
  let sequence = 0;
  chain = chain.then(async () => {
    const ledger = await readLedger();
    if (ledger.count >= LIMIT) throw new Error(`V052_HARD_CALL_LIMIT:${LIMIT}`);
    sequence = ++ledger.count;
    ledger.entries.push({ sequence, stage, id, at: new Date().toISOString(), transportRetry });
    await mkdir(resolve("results/v052"), { recursive: true });
    await writeFile(ledgerFile, `${JSON.stringify(ledger, null, 2)}\n`);
  });
  await chain;
  return sequence;
}

export class V052ApiClient {
  private readonly client: GeminiStructuredClient;
  constructor(apiKey: string, model: string) {
    this.client = new GeminiStructuredClient(apiKey, model);
  }
  async call(stage: V052Stage, id: string, request: StructuredCall): Promise<StructuredCallResult & { sequence: number; transportRetries: number }> {
    let last: unknown;
    for (let attempt = 0; attempt < 8; attempt++) {
      const sequence = await reserve(stage, id, attempt);
      try {
        return { ...(await this.client.call(request)), sequence, transportRetries: attempt };
      } catch (error) {
        last = error;
        const message = String((error as Error)?.message ?? error);
        if (attempt === 7 || !/high demand|fetch failed|ECONNRESET|timed out|Timeout|InternalServerError|500|503/i.test(message)) throw error;
        await new Promise((done) => setTimeout(done, [3_000, 6_000, 12_000, 24_000, 45_000][attempt] ?? 60_000));
      }
    }
    throw last;
  }
}
export async function v052CallLedger() { return readLedger(); }
