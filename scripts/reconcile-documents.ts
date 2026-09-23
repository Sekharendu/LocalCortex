// Brings data/documents.json back in line with Qdrant. For every record it finds the
// collection that actually holds the document's chunks and records it; records whose
// chunks exist nowhere (e.g. left by tests whose collections were dropped) are removed.
// It also reports chunks in the default collection that have no record (orphans) but
// never deletes points.
//
// Dry run by default. --apply backs up the file to documents.json.bak and writes.
// Don't ingest or delete documents while applying.
//
// Usage: npx tsx scripts/reconcile-documents.ts [--apply]
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { addDocument, deleteDocument, listDocuments, type DocumentRecord } from "../src/documentStore.js";
import { countByDocumentId, documentIdCounts, listCollections } from "../src/retrieval/vectorStore.js";
import { retrievalConfig } from "../src/config.js";

const DOC_STORE_PATH = process.env.DOC_STORE_PATH ?? "./data/documents.json";
const apply = process.argv.includes("--apply");

type Verdict =
  | { action: "keep"; record: DocumentRecord; collection: string; points: number; changed: boolean }
  | { action: "remove"; record: DocumentRecord };

async function locate(record: DocumentRecord, collections: string[]): Promise<{ collection: string; points: number } | null> {
  // Check the recorded collection first, then the rest.
  const order = record.collection ? [record.collection, ...collections.filter((c) => c !== record.collection)] : collections;
  for (const collection of order) {
    if (!collections.includes(collection)) continue;
    const points = await countByDocumentId(collection, record.id);
    if (points > 0) return { collection, points };
  }
  return null;
}

async function main(): Promise<void> {
  const collections = await listCollections();
  const records = await listDocuments();
  console.log(`${records.length} records in ${DOC_STORE_PATH}; collections: ${collections.join(", ")}\n`);

  const verdicts: Verdict[] = [];
  for (const record of records) {
    const found = await locate(record, collections);
    verdicts.push(
      found
        ? { action: "keep", record, ...found, changed: record.collection !== found.collection }
        : { action: "remove", record },
    );
  }

  const byCollection = new Map<string, Verdict[]>();
  for (const v of verdicts) {
    const key = v.action === "keep" ? v.collection : "(no chunks anywhere -> remove)";
    byCollection.set(key, [...(byCollection.get(key) ?? []), v]);
  }
  for (const [key, vs] of byCollection) {
    console.log(`${key}  (${vs.length})`);
    for (const v of vs) {
      const note =
        v.action === "keep"
          ? `${v.points} chunks${v.points !== v.record.chunkCount ? ` (record says ${v.record.chunkCount})` : ""}${v.changed ? "  [set collection]" : ""}`
          : `record says ${v.record.chunkCount} chunks`;
      console.log(`  ${v.record.id}  ${v.record.source.padEnd(48)} ${note}`);
    }
    console.log("");
  }

  // Chunks in the default collection with no record: answers use them, but the UI can't
  // list or delete them.
  const known = new Set(records.map((r) => r.id));
  const orphans = [...(await documentIdCounts(retrievalConfig.collection))].filter(([id]) => !known.has(id));
  console.log(
    orphans.length === 0
      ? `No orphan chunks in '${retrievalConfig.collection}'.`
      : `Orphan chunks in '${retrievalConfig.collection}' (no record; left untouched):\n${orphans.map(([id, n]) => `  ${id}  ${n} chunks`).join("\n")}`,
  );

  const removals = verdicts.filter((v) => v.action === "remove");
  const updates = verdicts.filter((v): v is Extract<Verdict, { action: "keep" }> => v.action === "keep" && v.changed);
  console.log(`\nPlan: remove ${removals.length} dead records, set collection on ${updates.length}, keep ${verdicts.length - removals.length}.`);

  if (!apply) {
    console.log("Dry run -- nothing written. Re-run with --apply to write.");
    return;
  }
  if (existsSync(DOC_STORE_PATH)) await fs.copyFile(DOC_STORE_PATH, `${DOC_STORE_PATH}.bak`);
  for (const v of removals) await deleteDocument(v.record.id);
  for (const v of updates) await addDocument({ ...v.record, collection: v.collection });
  console.log(`Applied. Backup: ${DOC_STORE_PATH}.bak`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
