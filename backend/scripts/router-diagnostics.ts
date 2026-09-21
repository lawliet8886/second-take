/** Paid, bounded diagnostic: rerun only the five failed synthetic smoke cases.
 * Never persist raw provider errors, project IDs, credentials or response text.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { loadConfig } from "../src/config/config.js";
import { VertexRouterClient } from "../src/vertex/router-client.js";
import { withinDeadline } from "../src/resilience/deadline.js";
import { VERTEX_SMOKE_CASES } from "./vertex-smoke-corpus.js";

const config = loadConfig();
const router = new VertexRouterClient(config.vertexProjectId);
const ids = new Set(["smoke-en-apology", "smoke-en-frustration", "smoke-pt-capability", "smoke-pt-claim", "smoke-pt-generalization"]);
const records = [];
for (const item of VERTEX_SMOKE_CASES.filter(row => ids.has(row.id))) {
  const start = performance.now();
  try {
    const result = await withinDeadline(router.route({ requestId: `DIAG_${item.id}`, text: item.text, locale: item.locale as "en-US" | "pt-BR", deadlineMs: 10_000 }), 10_000);
    records.push({ id: item.id, result: "SUCCESS", primaryIntent: result.envelope.primaryIntent, expectedIntent: item.canonicalPrimaryIntent, retries: result.retries, latencyMs: Math.round(performance.now() - start), usage: result.usage });
  } catch (error) {
    const message = String((error as Error)?.message ?? "");
    const kind = /429/.test(message) ? "HTTP_429" : /50[034]/.test(message) ? "HTTP_5XX" : /DEADLINE|timeout|abort/i.test(message) ? "DEADLINE" : /ENVELOPE_INVALID|ID_MISMATCH|JSON|schema/i.test(message) ? "STRUCTURAL" : "OTHER";
    records.push({ id: item.id, result: kind, latencyMs: Math.round(performance.now() - start) });
  }
  process.stdout.write(`router_diagnostic=${records.length}/${ids.size}\n`);
}
mkdirSync("results", { recursive: true });
const result = { createdAt: new Date().toISOString(), model: "gemini-3.7-flash", deadlineMs: 10_000, records, limitation: "One retry sample per previously failing input. Not a latency SLA or full billing accounting." };
writeFileSync("results/router-diagnostics.json", JSON.stringify(result, null, 2) + "\n");
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
