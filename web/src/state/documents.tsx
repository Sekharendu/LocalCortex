import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import * as api from "../api";
import { ApiError } from "../api";
import { SUPPORTED_EXTENSIONS, type DocumentRecord } from "../types";

export type UploadStatus = "queued" | "indexing" | "done" | "failed";

export interface Upload {
  key: string;
  /** The Space the file goes into, fixed when it's queued. */
  spaceId: string;
  file: File;
  status: UploadStatus;
  startedAt?: number;
  chunkCount?: number;
  error?: string;
}

interface DocumentsStore {
  /** The Space whose files are listed (the one open in the app). */
  spaceId: string | null;
  setSpaceId(id: string | null): void;
  /** The current Space's files. */
  documents: DocumentRecord[];
  loaded: boolean;
  loadError: string | null;
  /** Every Space's uploads; filter by `spaceId`. */
  uploads: Upload[];
  panelOpen: boolean;
  setPanelOpen(open: boolean): void;
  refresh(): Promise<void>;
  enqueue(files: File[]): void;
  retryUpload(key: string): void;
  dismissUpload(key: string): void;
  remove(id: string): Promise<string | null>;
}

const DocumentsContext = createContext<DocumentsStore | null>(null);

export function useDocuments(): DocumentsStore {
  const store = useContext(DocumentsContext);
  if (!store) throw new Error("useDocuments must be used inside <DocumentsProvider>");
  return store;
}

const DONE_VISIBLE_MS = 6000;

const STAGE_LABELS: Record<string, string> = {
  load: "reading the file",
  chunk: "splitting it into chunks",
  embed: "embedding",
  upsert: "saving to the index",
  persist: "recording it",
};

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot).toLowerCase() : "";
}

export function unsupportedReason(name: string): string | null {
  const ext = extensionOf(name);
  return SUPPORTED_EXTENSIONS.includes(ext)
    ? null
    : `Unsupported file type '${ext || "(none)"}'. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}.`;
}

/** Turns the ingest route's errors into something a person can act on. */
function describeUploadError(name: string, e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 413) return `${name} is larger than the upload limit (50 MB by default).`;
    const m = /^Ingest failed at stage '(\w+)': ([\s\S]*)$/.exec(e.message);
    if (m) return `Couldn't index ${name} while ${STAGE_LABELS[m[1]] ?? m[1]}: ${m[2]}`;
    return e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

let uploadKeys = 0;

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const [spaceId, setSpaceIdState] = useState<string | null>(null);
  const spaceRef = useRef(spaceId);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);

  // The queue runner reads the latest uploads without re-subscribing.
  const uploadsRef = useRef(uploads);
  uploadsRef.current = uploads;
  const running = useRef(false);

  const patch = useCallback((key: string, change: Partial<Upload>) => {
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...change } : u)));
  }, []);

  const dismissUpload = useCallback((key: string) => {
    setUploads((list) => list.filter((u) => u.key !== key));
  }, []);

  const refresh = useCallback(async () => {
    const id = spaceRef.current;
    if (!id) return;
    try {
      const docs = await api.listDocuments(id);
      if (spaceRef.current !== id) return; // switched Spaces meanwhile
      setDocuments(docs);
      setLoaded(true);
      setLoadError(null);
    } catch (e) {
      if (spaceRef.current === id) setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const setSpaceId = useCallback(
    (id: string | null) => {
      if (spaceRef.current === id) return;
      spaceRef.current = id;
      setSpaceIdState(id);
      setDocuments([]);
      setLoaded(false);
      setLoadError(null);
      void refresh();
    },
    [refresh],
  );

  // One upload at a time: Ollama embeds one request at a time, so parallel uploads would
  // only queue up server-side and make every progress timer misleading.
  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      for (;;) {
        const next = uploadsRef.current.find((u) => u.status === "queued");
        if (!next) break;
        // Mark it here too, so the next loop iteration can't pick it again before React re-renders.
        uploadsRef.current = uploadsRef.current.map((u) => (u.key === next.key ? { ...u, status: "indexing" } : u));
        patch(next.key, { status: "indexing", startedAt: Date.now() });
        try {
          const { chunkCount } = await api.uploadDocument(next.spaceId, next.file);
          patch(next.key, { status: "done", chunkCount });
          setTimeout(() => dismissUpload(next.key), DONE_VISIBLE_MS);
          if (spaceRef.current === next.spaceId) void refresh();
        } catch (e) {
          patch(next.key, { status: "failed", error: describeUploadError(next.file.name, e) });
        }
      }
    } finally {
      running.current = false;
    }
  }, [patch, dismissUpload, refresh]);

  const enqueue = useCallback(
    (files: File[]) => {
      const target = spaceRef.current;
      if (!target) return;
      const added: Upload[] = files.map((file) => {
        const reason = unsupportedReason(file.name);
        return { key: `u${++uploadKeys}`, spaceId: target, file, status: reason ? "failed" : "queued", error: reason ?? undefined };
      });
      uploadsRef.current = [...uploadsRef.current, ...added];
      setUploads((list) => [...list, ...added]);
      void pump();
    },
    [pump],
  );

  const retryUpload = useCallback(
    (key: string) => {
      uploadsRef.current = uploadsRef.current.map((u) => (u.key === key ? { ...u, status: "queued", error: undefined } : u));
      patch(key, { status: "queued", error: undefined });
      void pump();
    },
    [patch, pump],
  );

  /** Resolves to an error message, or null on success. */
  const remove = useCallback(async (id: string) => {
    try {
      await api.deleteDocument(id);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 404)) return e instanceof Error ? e.message : String(e);
    }
    setDocuments((list) => list.filter((d) => d.id !== id));
    return null;
  }, []);

  const store = useMemo<DocumentsStore>(
    () => ({
      spaceId,
      setSpaceId,
      documents,
      loaded,
      loadError,
      uploads,
      panelOpen,
      setPanelOpen,
      refresh,
      enqueue,
      retryUpload,
      dismissUpload,
      remove,
    }),
    [spaceId, setSpaceId, documents, loaded, loadError, uploads, panelOpen, refresh, enqueue, retryUpload, dismissUpload, remove],
  );

  return <DocumentsContext.Provider value={store}>{children}</DocumentsContext.Provider>;
}
