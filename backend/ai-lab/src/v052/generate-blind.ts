import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ModelProfile } from "../contracts/results.js";
import { PRIMARY_INTENTS, type ClaimType, type RouterIntent } from "./contracts.js";
import { INTENT_DEFINITIONS } from "./taxonomy.js";
import { V052ApiClient } from "./api-client.js";

const key = process.env.GEMINI_API_KEY?.trim(), model = process.env.GEMINI_MODEL?.trim() || "gemini-3.7-flash";
if (!key || key === "COLE_SUA_CHAVE_AQUI") throw new Error("Configure GEMINI_API_KEY only in ai-lab/.env");
if (model !== "gemini-3.7-flash") throw new Error("V052_MODEL_MUST_BE_gemini-3.7-flash");
const batchSize = 25, batchesPerIntentLocale = 8;
const claimTypes: ClaimType[] = ["DEADLINE_CHANGED", "PRIOR_PROMISE", "PERSONAL_HEALTH", "PERSONAL_EMPLOYMENT", "OTHER_USER_CLAIM"];
const styles = ["FORMAL", "CASUAL", "TERSE", "INDIRECT", "RUDE", "SUPPORTIVE", "TYPO_LIGHT", "AUDIO_TRANSCRIPT"];
const secondaryFor = (primary: RouterIntent, batch: number): RouterIntent[] => {
  if (batch > 1) return [];
  if (primary === "ASSERT_CLAIM") return batch === 0 ? ["EXPRESS_FRUSTRATION"] : ["REQUEST_COMPLETION"];
  if (primary === "OUT_OF_SCOPE") return ["EXPRESS_FRUSTRATION"];
  if (primary === "META_PROMPT_ATTACK") return ["ASSERT_CLAIM"];
  if (primary === "AMBIGUOUS") return [];
  return ["ASSERT_CLAIM"];
};
const schema = { type: "object", additionalProperties: false, required: ["utterances"], properties: { utterances: { type: "array", minItems: batchSize, maxItems: batchSize, items: { type: "object", additionalProperties: false, required: ["text", "claimSourceSpan"], properties: { text: { type: "string" }, claimSourceSpan: { type: "string" } } } } } } as const;
const profile: ModelProfile = { id: "v052-blind-generator-low", role: "simulator", thinkingLevel: "low", maxOutputTokens: 6500, samplingNote: "Blind dataset generation only; labels are fixed before generation." };
const outDir = resolve("results/v052/blind-generation-batches"); await mkdir(outDir, { recursive: true });
const client = new V052ApiClient(key, model);
const jobs = PRIMARY_INTENTS.flatMap((primaryIntent) => (["pt-BR", "en-US"] as const).flatMap((locale) => Array.from({ length: batchesPerIntentLocale }, (_, batch) => ({ primaryIntent, locale, batch }))));
let cursor = 0, done = 0;
async function worker() {
  for (;;) {
    const index = cursor++; if (index >= jobs.length) return;
    const job = jobs[index]!, secondaryIntents = secondaryFor(job.primaryIntent, job.batch);
    const claimRequired = job.primaryIntent === "ASSERT_CLAIM" || secondaryIntents.includes("ASSERT_CLAIM");
    const claimType = claimRequired ? claimTypes[(job.batch + PRIMARY_INTENTS.indexOf(job.primaryIntent)) % claimTypes.length]! : null;
    const id = `blind_${job.primaryIntent}_${job.locale}_${String(job.batch + 1).padStart(2, "0")}`, file = resolve(outDir, `${id}.json`);
    try { await readFile(file); done++; continue; } catch {}
    const call = await client.call("dataset_generation", id, {
      systemInstruction: "You generate a blind linguistic holdout. Labels are fixed developer data. Generate only natural user messages to Alex; never answer as Alex, classify, explain, or mention labels.",
      input: JSON.stringify({ scenario: "Alex is the user's teammate. Two research slides are unfinished and the presentation deadline is Friday.", locale: job.locale, primaryIntent: job.primaryIntent, primaryDefinition: INTENT_DEFINITIONS[job.primaryIntent], secondaryIntents, claimType, count: batchSize, styleFocus: styles[job.batch], constraints: ["Every message must express the primary intent.", job.primaryIntent === "AMBIGUOUS" ? "Each message must genuinely support two materially different readings without context, such as a polite request versus a real capability question. Do not write a clearly resolved demand, assertion, offer, or question; preserve the ambiguity in the surface itself." : (secondaryIntents.length ? `Every message must also express: ${secondaryIntents.join(", ")}.` : "Do not add a second conversational intent."), claimRequired ? `Every message must contain one explicit user-asserted ${claimType} claim; claimSourceSpan must copy the exact shortest contiguous clause that states it.` : "Do not invent a factual claim; claimSourceSpan must be an empty string.", "Produce five paraphrase groups of five messages: each consecutive group of five preserves meaning but changes formality, directness, length, punctuation, slang, or word order.", "Use plausible human language, including controlled casual/texting/transcription variation; no nonsense.", job.locale === "pt-BR" ? "Write directly in contemporary Brazilian Portuguese, never as literal translation." : "Write directly in contemporary conversational US English.", "Do not repeat prior examples or sentence frames."] }),
      schema, profile, timeoutMs: 180_000,
    });
    const rows = (call.rawOutput as any)?.utterances;
    if (!Array.isArray(rows) || rows.length !== batchSize) throw new Error(`INVALID_BLIND_BATCH:${id}`);
    const normalized = rows.map((row: any, i: number) => {
      if (typeof row?.text !== "string" || row.text.length < 2 || typeof row.claimSourceSpan !== "string") throw new Error(`INVALID_BLIND_ROW:${id}:${i}`);
      if (claimRequired && (!row.claimSourceSpan || !row.text.includes(row.claimSourceSpan))) row.claimSourceSpan = row.text;
      if (!claimRequired && row.claimSourceSpan) throw new Error(`UNEXPECTED_CLAIM_SPAN:${id}:${i}`);
      return { id: `${id}_U${String(i + 1).padStart(2, "0")}`, groupId: `${id}_G${Math.floor(i / 5) + 1}`, text: row.text, claimSourceSpan: row.claimSourceSpan };
    });
    const payload = { schemaVersion: "v052-blind-generation-batch-1", ...job, primaryIntent: job.primaryIntent, secondaryIntents, claimType, styleProfile: styles[job.batch], adversarial: job.primaryIntent === "META_PROMPT_ATTACK" || claimRequired, intentionallyAmbiguous: job.primaryIntent === "AMBIGUOUS", outOfScope: job.primaryIntent === "OUT_OF_SCOPE", usage: call.usage, latencyMs: call.latencyMs, estimatedCostUsd: call.estimatedCostUsd, sequence: call.sequence, transportRetries: call.transportRetries, utterances: normalized };
    await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`); done++; process.stdout.write(`blind-gen ${done}/${jobs.length} ${id} ${call.latencyMs}ms\n`);
  }
}
await Promise.all(Array.from({ length: 10 }, worker));
process.stdout.write(`V052_BLIND_GENERATION_COMPLETE jobs=${jobs.length} utterances=${jobs.length * batchSize}\n`);
