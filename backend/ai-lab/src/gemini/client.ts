import { GoogleGenAI } from "@google/genai";
import type { ModelProfile, TokenUsage } from "../contracts/results.js";

const INPUT_USD_PER_MILLION = 0.75;
const OUTPUT_USD_PER_MILLION = 3.75;

export type StructuredCall = {
  systemInstruction: string;
  input: string;
  schema: Record<string, unknown>;
  profile: ModelProfile;
  timeoutMs?: number;
};

export type StructuredCallResult = {
  rawOutput: unknown;
  latencyMs: number;
  usage: TokenUsage;
  estimatedCostUsd: number;
};

function numeric(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function usageFrom(response: unknown): TokenUsage {
  const record = response as { usage?: Record<string, unknown> };
  const usage = record.usage ?? {};
  return {
    inputTokens: numeric(usage.total_input_tokens),
    outputTokens: numeric(usage.total_output_tokens),
    thinkingTokens: numeric(usage.total_thought_tokens),
    totalTokens: numeric(usage.total_tokens),
  };
}

export function estimateCostUsd(usage: TokenUsage): number {
  return (usage.inputTokens * INPUT_USD_PER_MILLION + (usage.outputTokens + usage.thinkingTokens) * OUTPUT_USD_PER_MILLION) / 1_000_000;
}

export class GeminiStructuredClient {
  readonly #client: GoogleGenAI;
  readonly #model: string;

  constructor(apiKey: string, model: string) {
    this.#client = new GoogleGenAI({ apiKey });
    this.#model = model;
  }

  async call(request: StructuredCall): Promise<StructuredCallResult> {
    const started = performance.now();
    const response = await this.#client.interactions.create(
      {
        model: this.#model,
        system_instruction: request.systemInstruction,
        input: request.input,
        generation_config: {
          thinking_level: request.profile.thinkingLevel,
          max_output_tokens: request.profile.maxOutputTokens,
          ...(request.profile.seed === undefined ? {} : { seed: request.profile.seed }),
        },
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: request.schema,
        },
        store: false,
        stream: false,
      },
      { timeout_ms: request.timeoutMs ?? 60_000, retries: { strategy: "none" } },
    );
    const latencyMs = Math.round(performance.now() - started);
    const outputText = response.output_text;
    if (!outputText) throw new Error("EMPTY_MODEL_OUTPUT");
    let rawOutput: unknown;
    try {
      rawOutput = JSON.parse(outputText);
    } catch {
      rawOutput = { unparseableText: outputText };
    }
    const usage = usageFrom(response);
    return { rawOutput, latencyMs, usage, estimatedCostUsd: estimateCostUsd(usage) };
  }
}
