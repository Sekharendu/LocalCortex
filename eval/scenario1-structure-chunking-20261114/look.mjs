import { loadStructured } from "./structLoader.mjs";
const PDFS="C:/Users/hp/.codex/visualizations/2026/10/26/01a179e5-1fc9-7972-8730-2b3c14ea0da5/qasper-full-2026-10-28/pdf-acquisition-1793191591781/pdfs/";
const r=await loadStructured(PDFS+process.argv[2]+".pdf");
console.log("TITLE:",r.title,"| body",r.bodySize,"| blocks",r.blocks.length);
const full=process.argv[3]==="full";
for(const b of r.blocks) console.log(b.type==="heading"?`\n## [p${b.page}] ${b.text}`:`  [p${b.page}] (${b.text.length}) ${full?b.text:b.text.slice(0,110).replace(/\n/g," / ")}`);
