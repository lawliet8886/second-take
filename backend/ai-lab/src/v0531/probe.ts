import type { StructuredCallResult } from "../gemini/client.js";
import type { ContrastiveProbeRequest, ContrastiveProbeResult } from "./contracts.js";
import { PROBE_AMBIGUITY_CLASSES } from "./contracts.js";
import { PROBE_PROFILE_V0531, PROBE_SYSTEM_PROMPT_V0531 } from "./prompt.js";
import { probeBatchSchema } from "./schema.js";
import type { V0531VertexClient, V0531VertexResult } from "./vertex.js";

const member = <T extends readonly string[]>(values: T, value: unknown): value is T[number] => typeof value === "string" && values.includes(value as T[number]);

export function parseProbeBatch(raw: unknown, requests: ContrastiveProbeRequest[]): ContrastiveProbeResult[] {
  const rows = (raw as any)?.results;
  if (!Array.isArray(rows) || rows.length !== requests.length) throw new Error("PROBE_RESULT_COUNT");
  const expected = new Map(requests.map((request) => [request.id, request]));
  const seen = new Set<string>();
  return rows.map((row: any) => {
    const request = expected.get(row?.id);
    if (!request || seen.has(row.id)) throw new Error("PROBE_INVALID_OR_DUPLICATE_ID");
    seen.add(row.id);
    if (typeof row.alternativeIsMateriallyPlausible !== "boolean") throw new Error("PROBE_INVALID_BOOLEAN");
    if (!member(PROBE_AMBIGUITY_CLASSES, row.ambiguityClass) || row.ambiguityClass !== request.ambiguityClass) throw new Error("PROBE_CLASS_MISMATCH");
    if (!["HIGH", "MEDIUM", "LOW"].includes(row.confidence)) throw new Error("PROBE_INVALID_CONFIDENCE");
    return row as ContrastiveProbeResult;
  });
}

export async function runProbeBatch(
  client: V0531VertexClient,
  stage: string,
  id: string,
  requests: ContrastiveProbeRequest[],
): Promise<V0531VertexResult & { results: ContrastiveProbeResult[]; semanticRetry: 0 }> {
  const call = await client.call(stage, id, {
    systemInstruction: PROBE_SYSTEM_PROMPT_V0531,
    input: JSON.stringify({ items: requests }),
    schema: probeBatchSchema(requests.map((request) => request.id)),
    profile: PROBE_PROFILE_V0531,
    timeoutMs: 10_000,
  });
  return { ...call, results: parseProbeBatch(call.rawOutput, requests), semanticRetry: 0 };
}

export type ProbeCallLike = Pick<StructuredCallResult, "latencyMs" | "usage" | "estimatedCostUsd">;

