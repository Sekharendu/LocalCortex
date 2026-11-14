import fs from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
const PDFS="C:/Users/hp/.codex/visualizations/2026/10/26/01a179e5-1fc9-7972-8730-2b3c14ea0da5/qasper-full-2026-10-28/pdf-acquisition-1793191591781/pdfs/";
const [paper,pg="1",from="0",n="80"]=process.argv.slice(2);
const doc=await getDocument({data:new Uint8Array(fs.readFileSync(PDFS+paper+".pdf")),useSystemFonts:true}).promise;
const page=await doc.getPage(+pg);const vp=page.getViewport({scale:1});
const c=await page.getTextContent();
console.log("pages",doc.numPages,"w",vp.width,"h",vp.height,"items",c.items.length, Object.fromEntries(Object.entries(c.styles).map(([k,v])=>[k,v.fontFamily])));
for(const it of c.items.slice(+from,+from+ +n)) if("str" in it) console.log(JSON.stringify(it.str).slice(0,50).padEnd(52), it.transform.map(v=>Math.round(v*10)/10).join(","), "w",Math.round(it.width), it.fontName, it.hasEOL?"EOL":"");
