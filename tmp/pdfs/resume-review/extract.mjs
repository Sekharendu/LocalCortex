import fs from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const files = process.argv.slice(2);

for (const file of files) {
  const data = new Uint8Array(fs.readFileSync(file));
  const pdf = await getDocument({ data }).promise;
  console.log(`\n===== ${file} =====`);
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    let line = "";
    const lines = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = "";
      }
    }
    if (line) lines.push(line);
    console.log(lines.join("\n"));
  }
}
