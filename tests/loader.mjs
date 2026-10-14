// Node module hooks: lets the tests import the app's TypeScript files directly.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import ts from "typescript";

const shim = pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "vitest-shim.mjs")).href;

export async function resolve(specifier, context, next) {
  if (specifier === "vitest") return { url: shim, shortCircuit: true };
  if ((specifier.startsWith(".") || specifier.startsWith("/")) && !/\.[a-z]+$/i.test(specifier) && context.parentURL) {
    const base = specifier.startsWith("/") ? specifier : path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
      if (existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (/\.tsx?$/.test(url)) {
    const source = await readFile(fileURLToPath(url), "utf8");
    const out = ts.transpileModule(source, {
      fileName: fileURLToPath(url),
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, verbatimModuleSyntax: false },
    });
    return { format: "module", source: out.outputText, shortCircuit: true };
  }
  return next(url, context);
}
