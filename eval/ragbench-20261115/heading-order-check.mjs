// Read-only: for each heading v2 found, how much page text is visually BELOW it but stored BEFORE it
// (gets the previous heading's label), and visually ABOVE it but stored AFTER it (gets this heading wrongly).
// Uses the heading lists in header-test-v2-headers.json + header-test-v2b-headers.json. Dev PDFs only.
// Run (repo root): node eval/ragbench-20261115/heading-order-check.mjs
import fs from "node:fs";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs";
const HERE = "eval/ragbench-20261115";
const paths = new Map(fs.readFileSync(`${HERE}/dev.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).path).map((p) => [p.split("/").pop(), p]));
const MIN = 200; // chars: ~40% of a 500-char chunk
const out = [];
for (const [sample, file] of [["first 18", "header-test-v2-headers.json"], ["unseen 14", "header-test-v2b-headers.json"]]) {
  const h = JSON.parse(fs.readFileSync(`${HERE}/${file}`, "utf8"));
  for (const d of h.docs ?? h) {
    const path = paths.get(d.doc); if (!path || !path.includes("/docs/dev/")) throw new Error("no dev path " + d.doc);
    const heads = (d.allHeadings ?? []).map((s) => { const m = s.match(/^p(\d+): (.*)$/); return { page: +m[1], text: m[2] }; });
    const task = getDocument({ data: new Uint8Array(fs.readFileSync(path)) }); const doc = await task.promise;
    const rec = { sample, doc: d.doc, headings: heads.length, belowFirst: 0, aboveAfter: 0, examples: [] };
    for (const pg of [...new Set(heads.map((x) => x.page))]) {
      const page = await doc.getPage(pg); const H = page.getViewport({ scale: 1 }).height;
      const lines = []; let cur = null, idx = 0;
      for (const it of (await page.getTextContent()).items) {
        if (!("str" in it)) continue;
        if (!cur) cur = { text: "", y: H - it.transform[5], i: idx++ };
        cur.text += it.str;
        if (it.hasEOL) { if (cur.text.trim()) lines.push({ ...cur, text: cur.text.trim() }); cur = null; }
      }
      if (cur?.text.trim()) lines.push({ ...cur, text: cur.text.trim() });
      for (const hd of heads.filter((x) => x.page === pg)) {
        const L = lines.find((l) => l.text === hd.text) ?? lines.find((l) => l.text.startsWith(hd.text.slice(0, 30)));
        if (!L) continue;
        const below = lines.filter((l) => l.i < L.i && l.y > L.y + 2).reduce((a, l) => a + l.text.length, 0);
        const above = lines.filter((l) => l.i > L.i && l.y < L.y - 2).reduce((a, l) => a + l.text.length, 0);
        if (below >= MIN) rec.belowFirst++;
        if (above >= MIN) rec.aboveAfter++;
        if ((below >= MIN || above >= MIN) && rec.examples.length < 4) rec.examples.push(`p${pg} "${hd.text.slice(0, 50)}": ${below} chars below-but-before, ${above} above-but-after`);
      }
      page.cleanup();
    }
    await task.destroy();
    out.push(rec);
  }
}
fs.writeFileSync(`${HERE}/heading-order-check.json`, JSON.stringify(out, null, 1));
for (const r of out) console.log(`${r.sample.padEnd(9)} | ${r.doc.slice(0, 40).padEnd(40)} | headings ${String(r.headings).padStart(3)} | below-but-before ${String(r.belowFirst).padStart(3)} | above-but-after ${String(r.aboveAfter).padStart(3)}${r.examples.length ? "\n      " + r.examples.join("\n      ") : ""}`);
const t = (k) => out.reduce((a, r) => a + r[k], 0);
console.log(`TOTAL docs ${out.length} | headings ${t("headings")} | below-but-before ${t("belowFirst")} | above-but-after ${t("aboveAfter")} | docs affected ${out.filter((r) => r.belowFirst || r.aboveAfter).length}`);
