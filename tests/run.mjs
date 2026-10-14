// Runs every *.test.ts file in this folder. Use: npm test
import { register } from "node:module";
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(here, "loader.mjs")));

const files = readdirSync(here).filter((f) => f.endsWith(".test.ts")).sort();
for (const f of files) await import(pathToFileURL(path.join(here, f)).href);
const { runAll } = await import(pathToFileURL(path.join(here, "vitest-shim.mjs")).href);
process.exit((await runAll()) ? 1 : 0);
