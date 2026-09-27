/**
 * Renders the ~35 s teaser: motion-graphics scenes from teaser.html around a real clip
 * of the first answer from the demo take.
 *
 *   PROMO_DEPS=<dir with playwright-core + ffmpeg-static>  PROMO_OUT=<demo take dir>  npx tsx scripts/promo/render-teaser.ts
 *
 * teaser.html exposes render(scene, t) as a pure function of time, so every frame is a
 * screenshot at an exact 30 fps timestamp (no screen capture, no dropped frames). The
 * middle clip is cut from media/localcortex-demo-1080p.mp4 using the take's events.json,
 * so it is the same real answer as the demo. Writes media/localcortex-teaser-1080p.mp4
 * and a 1280-wide WebM. Silent.
 */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const deps = process.env.PROMO_DEPS;
const take = process.env.PROMO_OUT;
if (!deps || !take) throw new Error("set PROMO_DEPS and PROMO_OUT");
const req = createRequire(path.join(deps, "package.json"));
const { chromium } = req("playwright-core") as typeof import("playwright-core");
const ffmpeg = req("ffmpeg-static") as string;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const media = path.join(root, "media");
const CHROME = process.env.CHROME ??
  path.join(process.env.LOCALAPPDATA ?? "", "ms-playwright/chromium-1243/chrome-win64/chrome.exe");

const FPS = 30;
const XFADE = 0.6;
const SCENES = { a: 16, c: 8 } as const;

// ---- where the first answer sits in the demo mp4 (same cut logic as edit-demo.ts) ----
const { events } = JSON.parse(readFileSync(path.join(take, "events.json"), "utf8")) as {
  events: { name: string; t: number }[];
};
const at = (name: string) => {
  const e = events.find((x) => x.name === name);
  if (!e) throw new Error(`missing event ${name}`);
  return e.t;
};
const cuts: [number, number][] = [];
const cut = (from: number, to: number) => { if (to - from > 1) cuts.push([from, to]); };
cut(at("ingest:start") + 2.2, at("ingest:done") - 1.2);
for (const q of ["q1", "q2", "q3"]) cut(at(`${q}:send`) + 2.2, at(`${q}:done`) - 5);
const keep: [number, number][] = [];
let from = at("start") + 0.3;
for (const [a, b] of cuts.sort((x, y) => x[0] - y[0])) { keep.push([from, a]); from = b; }
keep.push([from, at("end")]);
function outTime(t: number) {
  let acc = 0;
  for (const [a, b] of keep) {
    if (t <= b) return acc + Math.max(0, t - a);
    acc += b - a;
  }
  return acc;
}
// From the question being typed to a beat after the "Answered in N s" caption.
const clipStart = outTime(at("q1:send")) - 3;
const clipEnd = outTime(at("q1:done")) + 2.8;
const clipLen = clipEnd - clipStart;

// ---- render the HTML scenes frame by frame ----
const work = path.join(take, "..", "teaser");
// TEASER_REUSE=1 skips the (slow, ~1 s/frame) render and only recomposes;
// TEASER_ONLY=c re-renders just the listed scenes.
const only = process.env.TEASER_ONLY?.split(",");
if (!process.env.TEASER_REUSE) {
if (!only) rmSync(work, { recursive: true, force: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ["--allow-file-access-from-files"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(path.join(root, "scripts/promo/teaser.html")).href);
await page.evaluate(() => document.fonts.ready);
for (const [scene, secs] of Object.entries(SCENES)) {
  if (only && !only.includes(scene)) continue;
  const dir = path.join(work, scene);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const n = Math.round(secs * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate(([s, t]) => (window as any).render(s, t), [scene, i / FPS] as const);
    await page.screenshot({ path: path.join(dir, `${String(i).padStart(4, "0")}.png`) });
  }
  console.log(`scene ${scene}: ${n} frames`);
}
await browser.close();
}

// ---- compose: A ⟶ clip ⟶ C with crossfades (the wallpapers match, so they blend) ----
const run = (args: string[]) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const mp4 = path.join(media, "localcortex-teaser-1080p.mp4");
const norm = `fps=${FPS},format=yuv420p,settb=AVTB`;
const off1 = SCENES.a - XFADE;
const off2 = off1 + clipLen - XFADE;
run([
  "-framerate", String(FPS), "-i", path.join(work, "a", "%04d.png"),
  "-ss", clipStart.toFixed(3), "-t", clipLen.toFixed(3), "-i", path.join(media, "localcortex-demo-1080p.mp4"),
  "-framerate", String(FPS), "-i", path.join(work, "c", "%04d.png"),
  "-filter_complex",
  `[0:v]${norm}[a];[1:v]${norm},setpts=PTS-STARTPTS[b];[2:v]${norm}[c];` +
  `[a][b]xfade=transition=fade:duration=${XFADE}:offset=${off1.toFixed(3)}[ab];` +
  `[ab][c]xfade=transition=fade:duration=${XFADE}:offset=${off2.toFixed(3)}[v]`,
  "-map", "[v]", "-pix_fmt", "yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-tune", "animation",
  "-movflags", "+faststart", mp4,
]);
run(["-i", mp4, "-vf", "scale=1280:-2:flags=lanczos", "-c:v", "libvpx-vp9", "-crf", "33", "-b:v", "0",
  "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", path.join(media, "localcortex-teaser.webm")]);
console.log(`clip ${clipStart.toFixed(1)}–${clipEnd.toFixed(1)} s of the demo; teaser ${(off2 + SCENES.c).toFixed(1)} s → ${mp4}`);
