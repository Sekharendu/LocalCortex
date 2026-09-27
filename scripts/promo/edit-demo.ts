/**
 * Cuts and encodes a take from record-demo.ts.
 *
 *   PROMO_DEPS=<dir with ffmpeg-static>  PROMO_OUT=<frames dir>  npx tsx scripts/promo/edit-demo.ts
 *
 * The waits (indexing, and each answer's generation time) are hard cuts: we keep the
 * moment a question is sent and the last few seconds of its answer streaming in, and the
 * caption shows the real time it took. Nothing is sped up. Writes to media/:
 * a 1080p H.264 MP4 (X / LinkedIn), a 1280-wide VP9 WebM and a GIF of the first answer.
 */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const deps = process.env.PROMO_DEPS;
const out = process.env.PROMO_OUT;
if (!deps || !out) throw new Error("set PROMO_DEPS and PROMO_OUT");
const ffmpeg = createRequire(path.join(deps, "package.json"))("ffmpeg-static") as string;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const media = path.join(root, "media");
mkdirSync(media, { recursive: true });

type Frame = { file: string; t: number };
const { events, frames } = JSON.parse(readFileSync(path.join(out, "events.json"), "utf8")) as {
  events: { name: string; t: number }[];
  frames: Frame[];
};
const at = (name: string) => {
  const e = events.find((x) => x.name === name);
  if (!e) throw new Error(`missing event ${name}`);
  return e.t;
};

// Spans of real time to drop.
const cuts: [number, number][] = [];
const cut = (from: number, to: number) => { if (to - from > 1) cuts.push([from, to]); };
cut(at("ingest:start") + 2.2, at("ingest:done") - 1.2);
for (const q of ["q1", "q2", "q3"]) cut(at(`${q}:send`) + 2.2, at(`${q}:done`) - 5);

// Everything between the cuts is kept, in real time.
const keep: [number, number][] = [];
let from = at("start") + 0.3;
for (const [a, b] of cuts.sort((x, y) => x[0] - y[0])) { keep.push([from, a]); from = b; }
keep.push([from, at("end")]);

/** Output time of a real timestamp (for picking the GIF range). */
function outTime(t: number) {
  let acc = 0;
  for (const [a, b] of keep) {
    if (t <= b) return acc + Math.max(0, t - a);
    acc += b - a;
  }
  return acc;
}

// ffconcat: each kept span shows the frame on screen at its start, then every frame
// that arrived inside it, each held until the next one (screencast only sends changes).
const lines = ["ffconcat version 1.0"];
let last = "";
for (const [a, b] of keep) {
  const inside = frames.filter((f) => f.t > a && f.t < b);
  const before = [...frames].reverse().find((f) => f.t <= a) ?? frames[0];
  const seq: Frame[] = [{ ...before, t: a }, ...inside];
  seq.forEach((f, i) => {
    const end = i + 1 < seq.length ? seq[i + 1].t : b;
    lines.push(`file '${path.join(out, f.file).replace(/\\/g, "/")}'`, `duration ${(end - f.t).toFixed(4)}`);
    last = f.file;
  });
}
lines.push(`file '${path.join(out, last).replace(/\\/g, "/")}'`);
const list = path.join(out, "cut.ffconcat");
writeFileSync(list, lines.join("\n"));

const total = keep.reduce((s, [a, b]) => s + b - a, 0);
console.log(`kept ${keep.length} spans, ${total.toFixed(1)} s (cut ${cuts.map(([a, b]) => (b - a).toFixed(0) + "s").join(", ")})`);

const run = (args: string[]) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const mp4 = path.join(media, "localcortex-demo-1080p.mp4");
run(["-f", "concat", "-safe", "0", "-i", list, "-vf", "fps=30,format=yuv420p",
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-tune", "animation", "-movflags", "+faststart", mp4]);
run(["-i", mp4, "-vf", "scale=1280:-2:flags=lanczos", "-c:v", "libvpx-vp9", "-crf", "33", "-b:v", "0",
  "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", path.join(media, "localcortex-demo-readme.webm")]);

// GIF: from opening the Documents panel to upload the handbook through to the end card, 960 wide.
// (The Documents click lands ~3 s before the file is added.)
const g0 = outTime(at("ingest:start")) - 3.5;
run(["-ss", g0.toFixed(2), "-i", mp4, "-vf",
  "fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
  path.join(media, "localcortex-demo.gif")]);
console.log(`wrote ${media}`);
