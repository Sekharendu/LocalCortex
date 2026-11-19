// Table detector + "table title" header for chunks (eval code only; nothing in src/ uses it).
// Works on the loader's page texts (pdf.js lines), before chunking, then maps tables to chunk ranges.
// The header never changes chunk boundaries or chunk text: it is a separate string per chunk.
//
// FROZEN SETTINGS (see SUMMARY.txt): change only together with a re-run of run.mts.
export const SETTINGS = {
  rowMaxLabelWords: 14,      // a row's text before its trailing numbers
  rowMaxLabelWordsMulti: 25, //   ... when the line ends with >= 2 numbers
  mergeGapLines: 3,          // a title-less table starting this close after the previous one continues it
  labelMaxWords: 6,          // short label line inside a table ("Current assets")
  labelColonMaxWords: 8,     // label ending with ":" ("3M Company shareholders' equity:")
  minRows: 3,                // rows needed for a table
  maxGap: 1,                 // non-row non-label lines allowed in a row; the 2nd ends the table
  maxLabelRun: 5,            // more consecutive label lines than this ends the table
  sentenceMinWords: 6,       // a line ending in "." with >= this many words is a sentence
  proseMinWords: 16,         // a line with >= this many words is prose even without a period
  titleMaxLines: 4,          // lines of a title block that may interrupt a table (new-table check)
  titleNameLines: 2,         // name lines kept above the units/period lines (or above the first row)
  titleLookback: 8,          // lines examined above the first row
  headerMaxChars: 200,
  boilerplateMinPages: 3,    // a page-edge line repeated on >= this many pages
  boilerplateMinShare: 0.2,  //   and on >= this share of the pages is boilerplate
  pageEdgeLines: 3,          // first/last N lines of a page are checked for boilerplate
  tocMaxPage: 500,           // TOC filter: single small integers, non-decreasing
};
const S = SETTINGS;

export type Kind = "row" | "period" | "units" | "label" | "sentence" | "other" | "blank" | "boiler";
export interface Line { page: number; start: number; end: number; docStart: number; text: string; kind: Kind; nums: number }
export interface Table {
  id: number; page: number; firstRow: number; lastRow: number; // line indices
  titleLines: number[]; header: string; rows: number;
  bodyStart: number; bodyEnd: number; titleStart: number; titleEnd: number; // doc offsets
  parts: { name: boolean; units: boolean; period: boolean };
}

const MONTH = "(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\\.?";
const PERIOD_WORDS = new RegExp(`\\b(${MONTH}|ended|ending|months|weeks|quarters?|years?|fiscal|fy|q[1-4]|as of|at|half|period)\\b`, "i");
export const UNITS_RE = /(\bin (millions|thousands|billions|mn|bn)\b|\((in |amounts in |dollars in |\$ ?in |\$|€|£|¥|rmb|us\$|hk\$|millions|thousands|billions|dollars|euros?)[^)]{0,80}\)|dollars in (millions|thousands)|millions of (dollars|euros|us)|(us\$|rmb|hk\$|\$|€|£)\s?['’]?\s?(000|million|mn|thousand)s?\b|\bexcept (per share|share|per-share)\b)/i;
export const STMT_RE = /(balance sheets?|statements? of (consolidated )?(income|operations|earnings|cash flows|financial (position|condition)|comprehensive|stockholders|shareholders|changes in|equity)|income statements?|cash flows?|table \d+|following table|summary|schedule|results of operations|reconciliation|segment)/i;

const NUM_TOKEN = /^(\(?[-–—]?[$€£¥]?\(?\d[\d,]*(\.\d+)?\)?%?\)?[*†‡]?|\(?[-–—]+\)?%?|n\/?a|nm|NM|N\/A|\*+)$/i;
const CUR_TOKEN = /^(\$|€|£|¥|%|\(|\)|US\$|RMB|HK\$)$/;

function words(s: string): string[] { return s.trim().split(/\s+/).filter(Boolean); }

/** Trailing numbers of a line: count of number-like tokens and the label text before them. */
export function tail(text: string): { nums: number; label: string } {
  const t = words(text);
  let i = t.length, nums = 0, digitOrDash = false;
  while (i > 0) {
    const tok = t[i - 1];
    if (NUM_TOKEN.test(tok)) { nums++; if (/[\d—–-]/.test(tok)) digitOrDash = true; i--; }
    else if (CUR_TOKEN.test(tok)) i--;
    else break;
  }
  return { nums: digitOrDash ? nums : 0, label: t.slice(0, i).join(" ") };
}

/** Column-header line made of dates / years / period words only ("June 30, 2023 December 31, 2022"). */
export function isPeriodLine(text: string): boolean {
  const s = text.trim();
  if (words(s).length > 20) return false;
  const hasYear = /\b(19|20)\d{2}\b/.test(s), hasWord = PERIOD_WORDS.test(s);
  if (!hasYear && !(hasWord && new RegExp(`\\b${MONTH}|ended|months`, "i").test(s))) return false;
  // remove the allowed parts; nothing numeric may remain
  if (/(^|\s)[-–—$](\s|$)|\$\s?\d/.test(s)) return false; // dashes / amounts: a row ("2021 —"), not a column header
  const rest = s.replace(new RegExp(`${MONTH}\\s+\\d{1,2}(st|nd|rd|th)?,?`, "gi"), " ")
    .replace(/\b\d{1,2},(?=\s*(19|20)\d{2})/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ").replace(new RegExp(MONTH, "gi"), " ").replace(/\bq[1-4]\b|\bfy\d*\b/gi, " ");
  if (/\d/.test(rest)) return false;
  // whatever text is left must be short (column words like "Change", "%", "Total")
  return words(rest.replace(/[^\p{L}\s]/gu, " ")).length <= 12;
}

function classify(text: string): { kind: Kind; nums: number } {
  const s = text.trim();
  if (!s) return { kind: "blank", nums: 0 };
  const w = words(s).length;
  if (UNITS_RE.test(s) && w <= 24 && !/\.$/.test(s)) return { kind: "units", nums: 0 };
  if (/\.$/.test(s) && w >= S.sentenceMinWords) return { kind: "sentence", nums: 0 };
  if (isPeriodLine(s)) return { kind: "period", nums: 0 };
  const { nums, label } = tail(s);
  const lw = words(label).length;
  if (nums > 0 && (lw <= S.rowMaxLabelWords || (nums >= 2 && lw <= S.rowMaxLabelWordsMulti)) && !(lw === 0 && nums === 1 && /^\d{1,3}$/.test(s))) return { kind: "row", nums };
  if (/[.!?]["”’)]?$/.test(s) && w >= S.sentenceMinWords) return { kind: "sentence", nums: 0 };
  if (w >= S.proseMinWords) return { kind: "sentence", nums: 0 };
  if (!/\.$/.test(s) && (w <= S.labelMaxWords || (/:$/.test(s) && w <= S.labelColonMaxWords)) && nums === 0) return { kind: "label", nums: 0 };
  return { kind: "other", nums: 0 };
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ");
const PAGE_NO = /^(page\s+)?([a-z]-)?\d{1,4}(\s+of\s+\d+)?$|^[ivxlc]+$|^table of contents$|^index$|^-\s*\d+\s*-$/i;

export function splitLines(pages: string[]): { lines: Line[]; pageStart: number[] } {
  const lines: Line[] = [];
  const pageStart: number[] = [];
  let doc = 0;
  for (const [p, text] of pages.entries()) {
    pageStart.push(doc);
    let pos = 0;
    for (const raw of text.split("\n")) {
      lines.push({ page: p, start: pos, end: pos + raw.length, docStart: doc + pos, text: raw, kind: "blank", nums: 0 });
      pos += raw.length + 1;
    }
    doc += text.length + 2; // pipeline joins pages with "\n\n"
  }
  // boilerplate: page-edge lines repeated on many pages, page numbers, "Table of Contents"
  const byPage = new Map<number, number[]>();
  lines.forEach((l, i) => { if (l.text.trim()) { const a = byPage.get(l.page) ?? []; a.push(i); byPage.set(l.page, a); } });
  const edge = new Set<number>();
  for (const idx of byPage.values()) {
    idx.slice(0, S.pageEdgeLines).forEach((i) => edge.add(i));
    idx.slice(-S.pageEdgeLines).forEach((i) => edge.add(i));
  }
  const pagesOf = new Map<string, Set<number>>();
  for (const i of edge) { const k = norm(lines[i].text); const s = pagesOf.get(k) ?? new Set(); s.add(lines[i].page); pagesOf.set(k, s); }
  const need = Math.max(S.boilerplateMinPages, Math.ceil(S.boilerplateMinShare * pages.length));
  for (const l of lines) Object.assign(l, classify(l.text));
  lines.forEach((l, i) => {
    if (l.kind === "blank") return;
    const t = l.text.trim();
    if (/^table of contents$/i.test(t)) { l.kind = "boiler"; return; }
    if (edge.has(i) && (PAGE_NO.test(t) || (pagesOf.get(norm(t))?.size ?? 0) >= need)) l.kind = "boiler";
  });
  return { lines, pageStart };
}

function isToc(lines: Line[], rows: number[]): boolean {
  let prev = -1, ok = 0;
  for (const i of rows) {
    const t = words(lines[i].text);
    const last = t[t.length - 1];
    if (lines[i].nums === 1 && /^\d{1,3}$/.test(last) && Number(last) <= S.tocMaxPage && Number(last) >= prev) { ok++; prev = Number(last); }
  }
  return ok >= 0.8 * rows.length;
}

export function detectTables(pages: string[]): { tables: Table[]; lines: Line[]; pageStart: number[] } {
  const { lines, pageStart } = splitLines(pages);
  const content = lines.map((_, i) => i).filter((i) => lines[i].kind !== "boiler" && lines[i].kind !== "blank");
  const tables: Table[] = [];
  const titleOf = (first: number): number[] => {
    // title: lines above the first row, same page, stop at a blank line, a row or a sentence (a sentence ending in ":" is kept)
    const above: number[] = [];
    for (let i = first - 1; i >= 0 && above.length < S.titleLookback; i--) {
      const L = lines[i];
      if (L.page !== lines[first].page) break;
      if (L.kind === "boiler") continue;
      if (L.kind === "blank" || L.kind === "row") break;
      if (L.kind === "sentence" || /\.$/.test(L.text.trim())) {
        const t = L.text.trim();
        // a lead-in sentence ending in ":" is title; so is the start of a wrapped lead-in ("... (in" / "thousands):")
        const topIsContinuation = above.length > 0 && /^[a-z]/.test(lines[above[above.length - 1]].text.trim());
        if (/:$/.test(t) || (topIsContinuation && !/[.!?]$/.test(t))) above.push(i);
        break;
      }
      above.push(i);
    }
    above.reverse(); // top -> bottom
    const meta = (i: number) => lines[i].kind === "units" || lines[i].kind === "period";
    const isUnaudited = (i: number) => /^\(?unaudited\)?$/i.test(lines[i].text.trim());
    const firstMeta = above.findIndex(meta);
    let pick: number[];
    if (firstMeta >= 0) {
      let lastMeta = firstMeta;
      above.forEach((i, n) => { if (meta(i)) lastMeta = n; });
      // name lines above the column header; body labels below it ("Assets", "Current assets") are not title
      const names = above.slice(0, firstMeta).filter((i) => !isUnaudited(i)).slice(-S.titleNameLines);
      pick = [...names, ...above.slice(firstMeta, lastMeta + 1).filter((i) => !isUnaudited(i))];
    } else {
      pick = above.filter((i) => !isUnaudited(i)).slice(-S.titleNameLines);
    }
    return pick;
  };
  let k = 0;
  while (k < content.length) {
    if (lines[content[k]].kind !== "row") { k++; continue; }
    const rows: number[] = [content[k]];
    let gap = 0, labelRun = 0, j = k + 1;
    for (; j < content.length; j++) {
      const L = lines[content[j]];
      if (L.kind === "row") { rows.push(content[j]); gap = 0; labelRun = 0; continue; }
      if (L.kind === "sentence") break;
      // a new title block (units line, or a title line followed by a period line) followed by rows starts a new table
      const block: Kind[] = [];
      for (let b = j; b < Math.min(content.length, j + S.titleMaxLines + 1) && lines[content[b]].kind !== "row"; b++) block.push(lines[content[b]].kind);
      const nextIsRow = j + block.length < content.length && lines[content[j + block.length]].kind === "row";
      const titleBlock = block.includes("units") || block.slice(1).includes("period") && ["label", "other"].includes(block[0]);
      if (nextIsRow && titleBlock && block.length <= S.titleMaxLines) break;
      if (L.kind === "label" || L.kind === "period") { if (++labelRun > S.maxLabelRun) break; continue; }
      if (++gap > S.maxGap) break;
    }
    k = Math.max(j, k + 1);
    if (isToc(lines, rows)) continue;
    // continuation: no title of its own, starts right after the previous table (a long-label line broke it)
    const prev = tables[tables.length - 1];
    if (prev && !titleOf(rows[0]).length) {
      const gapLines = content.indexOf(rows[0]) - content.indexOf(prev.lastRow) - 1;
      if (gapLines >= 0 && gapLines <= S.mergeGapLines && lines[prev.lastRow].page === lines[rows[0]].page) {
        prev.lastRow = rows[rows.length - 1]; prev.rows += rows.length;
        prev.bodyEnd = lines[prev.lastRow].docStart + lines[prev.lastRow].text.length;
        continue;
      }
    }
    if (rows.length < S.minRows) continue;
    const first = rows[0], last = rows[rows.length - 1];
    const pick = titleOf(first);
    let header = pick.map((i) => lines[i].text.trim()).join(" ").replace(/\s+/g, " ").trim();
    if (header.length > S.headerMaxChars) header = header.slice(0, S.headerMaxChars).replace(/\s+\S*$/, "") + "…";
    const kinds = pick.map((i) => lines[i].kind);
    tables.push({
      id: tables.length, page: lines[first].page, firstRow: first, lastRow: last, titleLines: pick, header, rows: rows.length,
      bodyStart: lines[first].docStart, bodyEnd: lines[last].docStart + lines[last].text.length,
      titleStart: pick.length ? lines[pick[0]].docStart : -1,
      titleEnd: pick.length ? lines[pick[pick.length - 1]].docStart + lines[pick[pick.length - 1]].text.length : -1,
      parts: {
        name: pick.some((i) => ["label", "other", "sentence"].includes(lines[i].kind) && /\p{L}{3}/u.test(lines[i].text)),
        units: kinds.includes("units") || UNITS_RE.test(header),
        period: kinds.includes("period") || /\b(19|20)\d{2}\b|ended/i.test(header),
      },
    });
  }
  return { tables, lines, pageStart };
}

export interface ChunkRef { i: number; page: number; start: number; end: number }
/** chunk index -> table id whose header it gets (see rule 6). */
export function assignHeaders(tables: Table[], chunks: ChunkRef[], pageStart: number[]): Map<number, number> {
  const out = new Map<number, number>();
  // tables are in document order; scan with a moving window
  let t0 = 0;
  for (const c of chunks) {
    const a = pageStart[c.page] + c.start, b = pageStart[c.page] + c.end;
    while (t0 < tables.length && tables[t0].bodyEnd <= a) t0++;
    let best = -1, bestOv = 0;
    for (let t = t0; t < tables.length && tables[t].bodyStart < b; t++) {
      const ov = Math.min(b, tables[t].bodyEnd) - Math.max(a, tables[t].bodyStart);
      if (ov > bestOv) { bestOv = ov; best = t; }
    }
    if (best < 0 || !tables[best].header) continue;
    const T = tables[best];
    if (T.titleStart >= a && T.titleEnd <= b) continue; // chunk already holds the title
    out.set(c.i, best);
  }
  return out;
}
