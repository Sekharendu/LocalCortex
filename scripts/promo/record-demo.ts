/**
 * Records the promo demo: the real chat UI, framed as a Mac window on stage.html,
 * driven by Playwright and captured frame by frame over CDP screencast.
 *
 *   PROMO_DEPS=<dir with playwright-core>  PROMO_OUT=<frames dir>  npx tsx scripts/promo/record-demo.ts
 *
 * Needs the demo stack: an API with its own collection/doc store/database, and the
 * web preview proxying to it (APP_URL, default http://localhost:4180). The stack must
 * start empty; every answer shown is a real one, and edit-demo.ts cuts the waits
 * using the event times this writes to events.json.
 */
import { createRequire } from "node:module";
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const deps = process.env.PROMO_DEPS;
const out = process.env.PROMO_OUT;
if (!deps || !out) throw new Error("set PROMO_DEPS and PROMO_OUT");
const require = createRequire(path.join(deps, "package.json"));
const { chromium } = require("playwright-core") as typeof import("playwright-core");

const APP_URL = process.env.APP_URL ?? "http://localhost:4180";
const CHROME =
  process.env.CHROME ??
  path.join(process.env.LOCALAPPDATA ?? "", "ms-playwright/chromium-1243/chrome-win64/chrome.exe");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

const QUESTIONS = [
  { text: "How many vacation days do I get per year?", caption: "Llama 3 is reading the handbook, on a laptop CPU" },
  { text: "And after five years?", caption: "Follow-ups keep the thread of the conversation" },
  { text: "What is the capital of France?", caption: "Something the handbook doesn't cover" },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const now = () => Date.now() / 1000;
const events: { name: string; t: number }[] = [];
const mark = (name: string) => {
  events.push({ name, t: now() });
  console.log(`${name.padEnd(14)} ${new Date().toISOString().slice(11, 19)}`);
};

// A copy with a friendly name: the file name is what the Documents panel shows.
const handbook = path.join(out, "..", "Employee Handbook.docx");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
copyFileSync(path.join(root, "data/eval-corpus.docx"), handbook);

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ["--hide-scrollbars"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, "stage.html")).href);
await page.evaluate(() => document.fonts.ready);

// ---- capture ----
const frames: { file: string; t: number }[] = [];
const cdp = await page.context().newCDPSession(page);
cdp.on("Page.screencastFrame", (f: { data: string; sessionId: number; metadata: { timestamp?: number } }) => {
  const file = `${String(frames.length).padStart(6, "0")}.jpg`;
  writeFileSync(path.join(out, file), Buffer.from(f.data, "base64"));
  frames.push({ file, t: f.metadata.timestamp ?? now() });
  void cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});

const app = page.frameLocator("#app");
const stage = {
  card: (html: string | null) => page.evaluate((h) => (window as any).stage.card(h), html),
  caption: (html: string | null) => page.evaluate((h) => (window as any).stage.caption(h), html),
  window: (on: boolean) => page.evaluate((o) => (window as any).stage.showWindow(o), on),
  cursor: (on: boolean) => page.evaluate((o) => (window as any).stage.cursor(o), on),
  move: (x: number, y: number, ms = 700) =>
    page.evaluate(([a, b, c]) => (window as any).stage.move(a, b, c), [x, y, ms] as const),
  press: () => page.evaluate(() => (window as any).stage.press()),
};

// Where the app sits on the stage: window at (72, 48), 38px title bar, content scaled 1.3x
// (keep in sync with stage.html). Playwright's own hit-testing doesn't follow the scale,
// so the cursor position is mapped here and clicks go through the DOM.
const APP_X = 72, APP_Y = 48 + 38, APP_SCALE = 1.3;

/** Glide the fake cursor to an element inside the app, then click it for real. */
async function clickIn(selector: string, ms = 750, click = true) {
  const el = app.locator(selector).first();
  await el.waitFor({ state: "visible", timeout: 15_000 });
  const r = await el.evaluate((e) => {
    const b = e.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  });
  await stage.move(APP_X + r.x * APP_SCALE, APP_Y + r.y * APP_SCALE, ms);
  await sleep(120);
  await stage.press();
  if (click) await el.evaluate((e) => (e as HTMLElement).click());
}

/** Resolves once the answer has finished streaming (the Stop button came and went). */
async function waitForAnswer(label: string) {
  const stop = app.locator('button[aria-label="Stop answering"]');
  await stop.waitFor({ state: "visible", timeout: 30_000 });
  const firstToken = app.locator(".turn-assistant .streaming").last();
  const tokenSeen = firstToken
    .filter({ hasText: /\S/ })
    .waitFor({ state: "visible", timeout: 400_000 })
    .then(() => mark(`${label}:token`))
    .catch(() => {});
  await stop.waitFor({ state: "detached", timeout: 400_000 });
  await tokenSeen;
  mark(`${label}:done`);
}

const SCREENCAST = { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 } as const;
await cdp.send("Page.startScreencast", SCREENCAST);
mark("start");

// 1. Title card; the app loads behind it.
await page.evaluate((u) => (window as any).stage.load(u), APP_URL);
await sleep(600);
await stage.card(`
  <div class="mark"></div>
  <h1 class="card-title">LocalCortex</h1>
  <p class="card-sub">Ask your documents. <em>Nothing leaves your machine.</em></p>`);
await app.locator(".composer textarea").waitFor({ timeout: 30_000 });
await sleep(3400);
await stage.card(null);
await sleep(500);
await stage.window(true);
await sleep(1500);

// 2. Add a document.
await stage.cursor(true);
await stage.caption("Add a PDF, Word, Markdown or text file");
await sleep(700);
await clickIn(".docs-btn");
await sleep(900);
// The press is shown on the drop zone; the file goes straight into its hidden input.
await clickIn(".dropzone", 750, false);
await app.locator('.sheet input[type="file"]').setInputFiles(handbook);
mark("ingest:start");
await stage.caption("Chunked and embedded on this machine by Ollama");
await app.locator(".doc-row:not([class*=upload-]) .doc-name", { hasText: "Employee Handbook.docx" }).waitFor({ timeout: 300_000 });
mark("ingest:done");
await sleep(1800);
await clickIn('button[aria-label="Close documents"]');
await sleep(700);

// 3. Ask, follow up, and ask something the document doesn't cover.
for (const [i, q] of QUESTIONS.entries()) {
  const label = `q${i + 1}`;
  await stage.caption(null);
  await clickIn(".composer textarea", 650, false);
  await app.locator(".composer textarea").focus();
  await sleep(250);
  await app.locator(".composer textarea").pressSequentially(q.text, { delay: 48 });
  await sleep(450);
  await clickIn('button[aria-label="Send"]', 450);
  mark(`${label}:send`);
  await sleep(300);
  await stage.move(1700, 900, 900); // out of the way of the answer
  await stage.caption(q.caption);
  const t0 = now();
  // The thinking time is cut in the edit, so stop capturing until the first token:
  // a 1080p screencast competes with llama3 for the CPU and slows the answer down.
  await sleep(2600);
  await cdp.send("Page.stopScreencast");
  await app
    .locator(".turn-assistant .streaming")
    .last()
    .filter({ hasText: /\S/ })
    .waitFor({ state: "visible", timeout: 400_000 })
    .catch(() => {});
  await cdp.send("Page.startScreencast", SCREENCAST);
  await waitForAnswer(label);
  const secs = Math.round(now() - t0);
  await sleep(250);
  await stage.caption(
    i === 2
      ? "Not in your documents? <b>It says so.</b>"
      : `Answered in <b>${secs} s</b> on a laptop CPU · no GPU, no cloud`,
  );
  await sleep(i === 2 ? 4000 : 3500);
}

// 4. End card.
await stage.caption(null);
await stage.cursor(false);
await stage.window(false);
await sleep(500);
await stage.card(`
  <h1 class="card-title" style="font-size:88px">LocalCortex</h1>
  <div class="stats">
    <div class="stat"><div class="n">61 / 62</div><div class="l">answers correct in testing</div></div>
    <div class="stat"><div class="n">14 / 14</div><div class="l">off-topic questions refused</div></div>
    <div class="stat"><div class="n">100%</div><div class="l">local, no cloud APIs</div></div>
  </div>
  <div class="stack">Ollama · Qdrant · Postgres — all on your machine</div>
  <div class="url">github.com/Sekharendu/LocalCortex</div>`);
await sleep(5500);
mark("end");

await cdp.send("Page.stopScreencast");
await sleep(300);
await browser.close();
writeFileSync(path.join(out, "events.json"), JSON.stringify({ events, frames }, null, 1));
console.log(`${frames.length} frames in ${(events.at(-1)!.t - events[0].t).toFixed(1)} s -> ${out}`);
