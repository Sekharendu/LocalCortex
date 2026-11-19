// Experimental structure-aware PDF loader (evaluation only; the app's src/ is untouched).
// Rebuilds lines from pdf.js item positions, then sections (headings by font size / style)
// and paragraphs (indent, vertical gap, short last line), and re-joins words hyphenated
// across lines. Output: { title, blocks: [{ type: "heading", text, level, page } |
// { type: "para", text, page }] } in reading order.
import fs from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const KNOWN = /^((\d+(\.\d+)*\.?|[A-Z]\.|[IVX]+\.)\s+)?(abstract|introduction|related work|background|conclusions?|conclusion and future work|references|bibliography|acknowledge?ments?|discussion|results?|experiments?|experimental setup|evaluation|methods?|methodology|approach|model|data(sets?)?|analysis|appendix|future work|limitations)\s*$/i;
const NUMBERED = /^(\d+(\.\d+)*\.?|[A-Z]\.|[IVX]+\.)\s+[A-Z]/;
const CAPTION = /^(table|figure|fig\.)\s*\d+\s*[:.]/i;

const mode = (pairs) => {
  const m = new Map();
  for (const [k, w] of pairs) m.set(k, (m.get(k) ?? 0) + w);
  let best, bw = -1;
  for (const [k, w] of m) if (w > bw) { best = k; bw = w; }
  return best;
};
const r1 = (v) => Math.round(v * 10) / 10;

function buildLines(items) {
  const lines = [];
  let cur = [];
  const close = () => {
    const parts = cur.filter((it) => it.str.length > 0);
    cur = [];
    if (parts.length === 0) return;
    let text = "";
    let prevEnd = null;
    for (const it of parts) {
      const x = it.transform[4];
      const size = Math.hypot(it.transform[2], it.transform[3]);
      if (prevEnd !== null && x - prevEnd > 0.15 * size && !/\s$/.test(text) && !/^\s/.test(it.str)) text += " ";
      text += it.str;
      prevEnd = x + it.width;
    }
    text = text.replace(/\s+/g, " ").trim();
    if (!text) return;
    const sized = parts.filter((it) => it.str.trim());
    const size = mode(sized.map((it) => [r1(Math.hypot(it.transform[2], it.transform[3])), it.str.length]));
    const font = mode(sized.map((it) => [it.fontName, it.str.length]));
    const main = sized.find((it) => r1(Math.hypot(it.transform[2], it.transform[3])) === size) ?? sized[0];
    lines.push({
      text, size, font,
      x0: sized[0].transform[4],
      x1: Math.max(...sized.map((it) => it.transform[4] + it.width)),
      y: main.transform[5],
    });
  };
  for (const it of items) {
    if (cur.length && it.str.trim()) {
      const last = [...cur].reverse().find((c) => c.str.trim());
      if (last) {
        const size = Math.hypot(it.transform[2], it.transform[3]);
        const dy = Math.abs(it.transform[5] - last.transform[5]);
        const backX = it.transform[4] < last.transform[4] - 2 * size;
        if (dy > 0.9 * Math.max(size, Math.hypot(last.transform[2], last.transform[3])) || (dy > 0.3 * size && backX)) close();
      }
    }
    cur.push(it);
    if (it.hasEOL) close();
  }
  close();
  return lines;
}

function joinLines(a, b) {
  if (/[A-Za-z]-$/.test(a) && /^[a-z]/.test(b)) return a.slice(0, -1) + b;
  return a + " " + b;
}

export async function loadStructured(filePath) {
  const task = getDocument({ data: new Uint8Array(fs.readFileSync(filePath)), useSystemFonts: true });
  const doc = await task.promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = content.items.filter((it) => "str" in it && it.transform[1] === 0 && it.transform[2] === 0);
    pages.push({ page: p, width: vp.width, height: vp.height, lines: buildLines(items) });
  }
  await task.destroy();

  // Running headers / footers: same text (digits ignored) near the top/bottom of 3+ pages.
  const norm = (t) => t.replace(/\d+/g, "#").toLowerCase();
  const edge = new Map();
  for (const pg of pages) for (const l of pg.lines) {
    if (l.y > pg.height * 0.92 || l.y < pg.height * 0.08) edge.set(norm(l.text), (edge.get(norm(l.text)) ?? 0) + 1);
  }
  const repeated = new Set([...edge].filter(([, n]) => n >= 3 && n >= pages.length * 0.3).map(([k]) => k));
  for (const pg of pages) {
    pg.lines = pg.lines.filter((l) => {
      if (/^\d{1,3}$/.test(l.text)) return false;
      if ((l.y > pg.height * 0.92 || l.y < pg.height * 0.08) && repeated.has(norm(l.text))) return false;
      return true;
    });
  }

  const all = pages.flatMap((pg) => pg.lines);
  const bodySize = mode(all.map((l) => [l.size, l.text.length]));
  const bodyFont = mode(all.filter((l) => l.size === bodySize).map((l) => [l.font, l.text.length]));
  const em = bodySize;

  // Title: the largest-font lines among the first lines of page 1.
  const first = pages[0]?.lines ?? [];
  const head = first.slice(0, 12);
  const titleSize = Math.max(...head.map((l) => l.size), 0);
  const titleLines = [];
  for (const l of first) {
    if (l.size === titleSize) titleLines.push(l.text);
    else if (titleLines.length) break;
  }
  const title = titleLines.reduce((a, b) => (a ? joinLines(a, b) : b), "").slice(0, 200);
  // Front matter (title, authors, affiliations) runs until the first real heading on page 1.
  const firstHeadingIdx = first.findIndex((l) => KNOWN.test(l.text) && (l.size > bodySize || l.font !== bodyFont));

  const isHeading = (l, pg, idx) => {
    const t = l.text;
    if (pg.page === 1 && (firstHeadingIdx < 0 ? idx < titleLines.length + 6 : idx < firstHeadingIdx)) return false;
    if (t.length < 3 || t.length > 90 || t.split(" ").length > 12) return false;
    if (CAPTION.test(t) || /[,;]$/.test(t) || /\.$/.test(t) && !/^(\d+(\.\d+)*\.?|[A-Z]\.|[IVX]+\.)$/.test(t)) return false;
    if (!/^[A-Z0-9]/.test(t)) return false;
    if (!/[A-Za-z]{3}/.test(t)) return false;
    const larger = l.size >= bodySize + 0.8;
    const styled = l.font !== bodyFont && l.size >= bodySize - 0.3;
    const numbered = NUMBERED.test(t);
    const known = KNOWN.test(t);
    return (larger && (numbered || known || t.split(" ").length <= 10)) || (styled && (numbered || known));
  };

  const blocks = [];
  if (titleLines.length) blocks.push({ type: "para", text: "", page: 1, front: true });
  let para = null; // { text, page, last: line, key }
  const flush = () => {
    if (para && para.text.trim()) blocks.push({ type: "para", text: para.text.trim(), page: para.page });
    para = null;
  };
  let front = blocks[0] ?? null;

  for (const pg of pages) {
    const keyOf = (l) => (l.x1 - l.x0 > pg.width * 0.6 ? "F" : l.x0 < pg.width / 2 - 20 ? "L" : "R");
    const colLeft = {}, colRight = {};
    for (const k of ["L", "R", "F"]) {
      const ls = pg.lines.filter((l) => keyOf(l) === k && l.size === bodySize);
      colLeft[k] = ls.length ? mode(ls.map((l) => [Math.round(l.x0), 1])) : null;
      colRight[k] = ls.length ? mode(ls.map((l) => [Math.round(l.x1), 1])) : null;
    }
    pg.lines.forEach((l, idx) => {
      const inFront = pg.page === 1 && (firstHeadingIdx < 0 ? false : idx < firstHeadingIdx);
      if (inFront && front) { front.text = !front.text ? l.text
        : /[A-Za-z]-$/.test(front.text) && /^[a-z]/.test(l.text) ? front.text.slice(0, -1) + l.text
        : front.text + "\n" + l.text;
        return; }
      if (isHeading(l, pg, idx)) {
        flush();
        const m = l.text.match(/^(\d+(?:\.\d+)*)\.?\s/);
        const level = m ? m[1].split(".").length : 1;
        const prev = blocks[blocks.length - 1];
        // A bare section number on its own line ("3") followed by the name: merge.
        if (prev && prev.type === "heading" && /^(\d+(\.\d+)*\.?|[A-Z]\.|[IVX]+\.)$/.test(prev.text)) {
          prev.text = prev.text + " " + l.text;
          prev.line = l;
        } else if (prev && prev.type === "heading" && prev.page === pg.page && prev.line &&
            !NUMBERED.test(l.text) && !KNOWN.test(l.text) && prev.line.size === l.size && prev.line.font === l.font &&
            prev.line.y > l.y && prev.line.y - l.y < 1.6 * l.size && Math.abs(prev.line.x0 - l.x0) < 3 * em) {
          // A heading wrapped onto a second line.
          prev.text = joinLines(prev.text, l.text);
          prev.line = l;
        } else blocks.push({ type: "heading", text: l.text, level, page: pg.page, line: l });
        return;
      }
      const key = keyOf(l);
      let newPara = !para;
      if (para) {
        const p = para.last;
        const samePage = para.lastPage === pg.page;
        const sameCol = samePage && para.key === key && p.y > l.y;
        const indent = colLeft[key] !== null && l.x0 - colLeft[key] > 0.5 * em && l.x0 - colLeft[key] < 4 * em;
        const prevIndent = para.lastIndent;
        const shortPrev = /[.?!:]["”)]?$/.test(p.text) && colRight[para.key] !== null && p.x1 < colRight[para.key] - 1.5 * em;
        if (CAPTION.test(l.text)) newPara = true;
        else if (Math.abs(l.size - p.size) > 1) newPara = true;
        else if (sameCol && p.y - l.y > 1.6 * Math.max(l.size, p.size)) newPara = true;
        else if (indent && !prevIndent && /[.?!:]["”)]?$/.test(p.text)) newPara = true;
        else if (shortPrev) newPara = true;
        if (newPara) para.lastIndent = indent;
      }
      if (newPara) {
        flush();
        para = { text: l.text, page: pg.page };
      } else para.text = joinLines(para.text, l.text);
      para.last = l;
      para.lastPage = pg.page;
      para.key = key;
      para.lastIndent = colLeft[key] !== null && l.x0 - colLeft[key] > 0.5 * em && l.x0 - colLeft[key] < 4 * em;
    });
  }
  flush();
  return { title: title || "", blocks: blocks.filter((b) => b.text && b.text.trim()), bodySize };
}

/** Markdown-ish full text: "## heading" lines, paragraphs separated by blank lines. */
export function blocksToText(blocks) {
  return blocks.map((b) => (b.type === "heading" ? `## ${b.text}` : b.text)).join("\n\n");
}
