// Ingests every file in data/large-corpus/ into a dedicated collection (default
// "rag-large"), kept separate from the small-corpus "rag" collection used for the
// original eval so the two are never mixed or overwritten by mistake. Calls
// ingestDocument() directly rather than POST /ingest, since the HTTP route has no
// `collection` field and always uses whatever the running server's QDRANT_COLLECTION
// env is set to.
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { ingestDocument } from "../src/ingest/pipeline.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function argValue(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

async function main(): Promise<void> {
  const collection = argValue("--collection", "rag-large");
  // --file ingests a single file (e.g. data/eval-corpus.txt) instead of a whole directory.
  const singleFile = argValue("--file", "");
  const dir = singleFile
    ? path.dirname(path.resolve(ROOT, singleFile))
    : path.resolve(ROOT, argValue("--dir", "data/large-corpus"));

  const files = singleFile
    ? [path.basename(singleFile)]
    : (await fs.readdir(dir)).filter((f) => f.endsWith(".txt"));
  console.log(`Ingesting ${files.length} file(s) from ${path.relative(ROOT, dir)} into collection '${collection}'`);

  let totalChunks = 0;
  for (const file of files) {
    const filePath = path.join(dir, file);
    process.stdout.write(`  ${file} ... `);
    const result = await ingestDocument(filePath, { collection, strategy: "recursive", originalName: file });
    if (!result.success) {
      console.log(`FAILED at stage '${result.stage}': ${result.error}`);
      continue;
    }
    totalChunks += result.chunkCount;
    console.log(`documentId=${result.documentId} chunkCount=${result.chunkCount}`);
  }

  console.log(`\nDone. Total chunks ingested: ${totalChunks}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
