import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { BlindCase } from "./contracts.js";
const data = JSON.parse(await readFile(resolve("results/v052/blind-dataset.json"), "utf8")) as { cases: BlindCase[] };
const hash = (s: string) => createHash("sha256").update(`v052-manual:${s}`).digest("hex");
const buckets = new Map<string, BlindCase[]>();
for (const row of data.cases) { const key = `${row.canonicalPrimaryIntent}:${row.locale}`; const values = buckets.get(key) ?? []; values.push(row); buckets.set(key, values); }
const sample = [...buckets.entries()].flatMap(([, rows]) => rows.sort((a, b) => hash(a.id).localeCompare(hash(b.id))).slice(0, 12));
for (const locale of ["pt-BR", "en-US"] as const) sample.push(...data.cases.filter((x) => x.locale === locale).sort((a, b) => hash(`extra:${a.id}`).localeCompare(hash(`extra:${b.id}`))).slice(0, 10));
if (sample.length !== 500) throw new Error(`EXPECTED_500_GOT_${sample.length}`);
const payload = { schemaVersion: "v052-manual-review-sample-1", sampleSize: sample.length, balance: Object.fromEntries([...buckets.keys()].map((key) => [key, sample.filter((x) => `${x.canonicalPrimaryIntent}:${x.locale}` === key).length])), rows: sample.map((x) => ({ id: x.id, locale: x.locale, primary: x.canonicalPrimaryIntent, secondary: x.coreSecondaryIntents, text: x.text })) };
await writeFile(resolve("results/v052/manual-review-sample.json"), `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`V052_MANUAL_REVIEW_SAMPLE ${sample.length}\n`);
