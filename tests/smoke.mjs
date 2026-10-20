// Opens every page of the built app in a real browser and fails on a crash, a console error,
// a blank page, or sideways scrolling on a phone.
//   node tests/smoke.mjs                       serves ./dist and tests it
//   SMOKE_URL=https://example.com/PixelPlan/ node tests/smoke.mjs   tests a deployed copy
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const PAGES = ["project", "screen", "data", "canvas", "power", "distro", "rigging", "cables", "picklist", "report"];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2" };

let server;
let base = process.env.SMOKE_URL;
if (!base) {
  const root = join(process.cwd(), "dist");
  server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent((req.url || "/").split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    try {
      const file = path.endsWith("/") ? join(root, path, "index.html") : join(root, path);
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}/`;
}

const browser = await chromium.launch();
const failures = [];
const sizes = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "phone", width: 390, height: 780 },
];

for (const size of sizes) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, serviceWorkers: "block" });
  const page = await ctx.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(`error: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|fonts\.g|ERR_(INTERNET|NAME|CONNECTION)|Failed to load resource/i.test(m.text())) problems.push(`console: ${m.text()}`);
  });
  for (const id of PAGES) {
    problems.length = 0;
    await page.goto(`${base}#/${id}`, { waitUntil: "load" });
    await page.waitForSelector("main, h1, h2", { timeout: 15000 }).catch(() => problems.push("nothing rendered"));
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => ({
      text: document.body.innerText.trim().length,
      wide: document.documentElement.scrollWidth - window.innerWidth,
    }));
    if (info.text < 80) problems.push(`page looks blank (${info.text} characters)`);
    if (size.name === "phone" && info.wide > 2) problems.push(`scrolls sideways by ${info.wide}px`);
    for (const p of problems) failures.push(`${size.name} / ${id}: ${p}`);
    console.log(`${problems.length ? "FAIL" : "ok  "} ${size.name} ${id}`);
  }
  await ctx.close();
}

await browser.close();
server?.close();
if (failures.length) {
  console.error("\n" + failures.join("\n"));
  process.exit(1);
}
console.log("\nEvery page opened cleanly.");
