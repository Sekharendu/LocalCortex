import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const DOC_STORE_PATH = process.env.DOC_STORE_PATH ?? "./data/documents.json";

export interface DocumentRecord {
  id: string;
  source: string;
  ingestedAt: string;
  chunkCount: number;
  /** Qdrant collection holding the document's chunks. Missing on records written before
   * this field existed; scripts/reconcile-documents.ts fills it in. */
  collection?: string;
}

/**
 * Minimal Document Store: a JSON file backed on-disk record of every ingested document.
 * Kept separate from the Qdrant vector store per the architecture -- Qdrant answers
 * "which chunks are similar to this query?" and the Document Store answers "which
 * documents have we ingested, when, with how many chunks?"
 *
 * Concurrency: a module-level Promise chain serializes writes so a batch ingest never
 * interleaves two read-modify-write cycles and corrupts the file. This is deliberately
 * single-process; cross-process locking is out of scope.
 *
 * Writes are atomic via temp-file + rename so a crash mid-write cannot leave a
 * truncated document store.
 */

let writeChain: Promise<unknown> = Promise.resolve();

type StoreShape = Record<string, DocumentRecord>;

//if path exists then reads the file and returns the data, if not then reutrns an {}
async function readStore(): Promise<StoreShape> {
  if (!existsSync(DOC_STORE_PATH)) return {};
  try {
    const raw = await fs.readFile(DOC_STORE_PATH, "utf8");
    if (raw.trim().length === 0) return {};
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch (e) {
    throw new Error(`DocumentStore: failed to read ${DOC_STORE_PATH}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function writeStoreAtomic(data: StoreShape): Promise<void> {
  await fs.mkdir(path.dirname(DOC_STORE_PATH), { recursive: true });
  const tmp = `${DOC_STORE_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");//creates a temp file, with all the old+newly attached data
  // rename over the target -- atomic on POSIX; on Windows it's near-atomic and
  // good enough for a single-process local pipeline.
  await fs.rename(tmp, DOC_STORE_PATH);// renames the temp file to documents.json, replacing the old file with the new one with old+new record.
  //doing this cuz if writing on original file there is a crash we might loose data, so for safety i used this
}

function serialize<T>(work: () => Promise<T>): Promise<T> {
  const run = writeChain.then(work, work);// 1st time writeChain is a resolved promise, from the next time it is a promise that waits for the completeiton of the previous work
  // by doing this we are letting requests to change the document.json file only whern the prev request done editing the file
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function addDocument(record: DocumentRecord): Promise<void> {
  return serialize(async () => {
    const store = await readStore();
    store[record.id] = record;
    await writeStoreAtomic(store);
  });
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  // Read is not serialized -- concurrent reads are safe; we only need serialization
  // around read-modify-write cycles (the writes).
  const store = await readStore();
  return store[id] ?? null;
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  const store = await readStore();
  return Object.values(store);
}

export async function deleteDocument(id: string): Promise<DocumentRecord | null> {
  return serialize(async () => {
    const store = await readStore();
    const removed = store[id] ?? null;
    if (removed) {
      delete store[id];
      await writeStoreAtomic(store);
    }
    return removed;
  });
}