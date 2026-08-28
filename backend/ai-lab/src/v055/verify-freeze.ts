import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { hashV055Files } from "./fingerprint.js";

const frozen = JSON.parse(await readFile(resolve("results/v055/intent-lock-freeze.json"), "utf8"));
const actual = await hashV055Files(frozen.frozenFiles);
if (actual !== frozen.intentLockHash) throw new Error(`V055_INTENT_LOCK_FREEZE_MISMATCH:${actual}`);
process.stdout.write(`V055_INTENT_LOCK_FREEZE_OK ${actual}\n`);
