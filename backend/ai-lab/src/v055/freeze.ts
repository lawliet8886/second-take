import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { hashV055Files, V055_FROZEN_FILES } from "./fingerprint.js";

const payload = {
  schemaVersion: "v055-intent-lock-freeze-1",
  createdAt: new Date().toISOString(),
  intentLockHash: await hashV055Files(),
  frozenFiles: V055_FROZEN_FILES,
  uxDecision: "A_INLINE_CHIPS_WITHOUT_PRESELECTION",
  preserved: {
    parserV0282: "177ba8dabf14daf4eed1f7341878f61255a7add5de05774376d919355dc32d75",
    policyV051: "ea950e2b8198392ac8c2c7f8e1124ca266e686130cc3bb9825cab07b3fd7489b",
    graphV05: "8b784ac33b1a8cc15cfc220c47275f08eceeecaf6ba2f921c39c988e6c5d89fa",
    routerV052: "e57f07177685846d8c9e3dfd6b5e417a139e0a1de124ea343ec15bfcaaaa79b8",
    routerV0521: "5c25473ea141d91eb08f3a764082b56eb922ba47da9de94df592775f47a0475a",
    responsePlans: 25,
  },
};
await mkdir(resolve("results/v055"), { recursive: true });
await writeFile(resolve("results/v055/intent-lock-freeze.json"), `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
