import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { StructuredCall } from "../gemini/client.js";
import { estimateCostUsd } from "../gemini/client.js";
import type { TokenUsage } from "../contracts/results.js";

export type V0531Attempt = { attempt: number; timestamp: string; latencyMs: number; httpStatus: number | null; outcome: "SUCCESS" | "ERROR"; errorClass?: string; errorMessage?: string };
export type V0531VertexResult = {
  rawOutput: unknown; latencyMs: number; fullLatencyMs: number; usage: TokenUsage; estimatedCostUsd: number;
  attempts: V0531Attempt[]; transportRetries: number; httpStatus: 200;
  transportRoute: "VERTEX_AI_GLOBAL_GENERATE_CONTENT"; endpointHost: "aiplatform.googleapis.com"; location: "global"; modelVersion: string | null;
};

export class V0531TransportFailure extends Error {
  constructor(message: string, readonly attempts: V0531Attempt[], readonly fullLatencyMs: number) { super(message); this.name = "V0531TransportFailure"; }
}

const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;
const status = (error: unknown) => {
  const value = error as any;
  for (const candidate of [value?.status, value?.code]) if (typeof candidate === "number") return candidate;
  const match = String(value?.message ?? error).match(/\b(4\d\d|5\d\d)\b/); return match ? Number(match[1]) : null;
};
const errorClass = (error: unknown, code: number | null) => {
  const message = String((error as any)?.message ?? error);
  if (code === 429) return "HTTP_429"; if (code === 500) return "HTTP_500"; if (code === 503) return "HTTP_503"; if (code === 504) return "HTTP_504";
  if (/ECONNRESET|fetch failed/i.test(message)) return "ECONNRESET"; if (/timed out|timeout|deadline/i.test(message)) return "TIMEOUT"; return "OTHER";
};
const retryable = (kind: string) => ["HTTP_429", "HTTP_500", "HTTP_503", "HTTP_504", "ECONNRESET", "TIMEOUT"].includes(kind);
const usage = (response: any): TokenUsage => { const value = response?.usage ?? response?.usageMetadata ?? {}; return { inputTokens: numeric(value.total_input_tokens ?? value.promptTokenCount), outputTokens: numeric(value.total_output_tokens ?? value.candidatesTokenCount), thinkingTokens: numeric(value.total_thought_tokens ?? value.thoughtsTokenCount), totalTokens: numeric(value.total_tokens ?? value.totalTokenCount) }; };

export class V0531VertexClient {
  readonly #client: GoogleGenAI;
  constructor(readonly project: string, readonly maxAttempts = 2) {
    if (!project.trim()) throw new Error("VERTEX_PROJECT_REQUIRED");
    this.#client = new GoogleGenAI({ vertexai: true, project, location: "global", httpOptions: { baseUrl: "https://aiplatform.googleapis.com" } });
  }
  async call(stage: string, id: string, request: StructuredCall): Promise<V0531VertexResult> {
    const attempts: V0531Attempt[] = []; const fullStart = performance.now(); let last: unknown;
    for (let index = 0; index < this.maxAttempts; index++) {
      const start = performance.now(), timestamp = new Date().toISOString();
      try {
        const response = await this.#client.models.generateContent({ model: "gemini-3.7-flash", contents: request.input, config: { systemInstruction: request.systemInstruction, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }, maxOutputTokens: request.profile.maxOutputTokens, responseMimeType: "application/json", responseJsonSchema: request.schema, httpOptions: { timeout: request.timeoutMs ?? 10_000, retryOptions: { attempts: 1 } } } });
        const latencyMs = Math.round(performance.now() - start); attempts.push({ attempt: index + 1, timestamp, latencyMs, httpStatus: 200, outcome: "SUCCESS" });
        if (!response.text) throw new Error("EMPTY_MODEL_OUTPUT");
        const tokenUsage = usage(response); return { rawOutput: JSON.parse(response.text), latencyMs, fullLatencyMs: Math.round(performance.now() - fullStart), usage: tokenUsage, estimatedCostUsd: estimateCostUsd(tokenUsage), attempts, transportRetries: index, httpStatus: 200, transportRoute: "VERTEX_AI_GLOBAL_GENERATE_CONTENT", endpointHost: "aiplatform.googleapis.com", location: "global", modelVersion: typeof (response as any).modelVersion === "string" ? (response as any).modelVersion : null };
      } catch (error) {
        last = error; const latencyMs = Math.round(performance.now() - start), code = status(error), kind = errorClass(error, code); attempts.push({ attempt: index + 1, timestamp, latencyMs, httpStatus: code, outcome: "ERROR", errorClass: kind, errorMessage: String((error as any)?.message ?? error).slice(0, 500) });
        if (index + 1 >= this.maxAttempts || !retryable(kind)) throw new V0531TransportFailure(String((error as any)?.message ?? error), attempts, Math.round(performance.now() - fullStart));
        await new Promise((resolve) => setTimeout(resolve, 500 + Math.round(Math.random() * 400)));
      }
    }
    throw last;
  }
}

