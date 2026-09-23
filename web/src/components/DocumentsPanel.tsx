import { useEffect, useRef, useState, type DragEvent } from "react";
import { useDocuments, type Upload } from "../state/documents";
import { SUPPORTED_EXTENSIONS, type DocumentRecord } from "../types";
import { AlertIcon, CheckIcon, CloseIcon, FileIcon, RetryIcon, TrashIcon, UploadIcon } from "./Icons";
import { ConfirmDialog } from "./Modal";

function relativeDate(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(then)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short", year: then.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="tabular">{Math.max(0, Math.floor((now - since) / 1000))}s</span>;
}

function UploadRow({ upload }: { upload: Upload }) {
  const { retryUpload, dismissUpload } = useDocuments();
  return (
    <li className={`doc-row upload-${upload.status}`}>
      <span className="doc-icon">
        {upload.status === "done" ? (
          <CheckIcon width={16} height={16} />
        ) : upload.status === "failed" ? (
          <AlertIcon width={16} height={16} />
        ) : (
          <span className="spinner" aria-hidden="true" />
        )}
      </span>
      <div className="doc-text">
        <span className="doc-name" title={upload.file.name}>
          {upload.file.name}
        </span>
        <span className="doc-meta">
          {upload.status === "queued" && "Waiting…"}
          {upload.status === "indexing" && upload.startedAt !== undefined && (
            <>
              Indexing… <Elapsed since={upload.startedAt} />
            </>
          )}
          {upload.status === "done" && `Indexed · ${upload.chunkCount} chunks`}
          {upload.status === "failed" && upload.error}
        </span>
      </div>
      {upload.status === "failed" && (
        <div className="doc-actions visible">
          {!upload.error?.startsWith("Unsupported") && (
            <button className="icon-btn icon-btn-sm" onClick={() => retryUpload(upload.key)} aria-label={`Retry ${upload.file.name}`} title="Retry">
              <RetryIcon width={15} height={15} />
            </button>
          )}
          <button className="icon-btn icon-btn-sm" onClick={() => dismissUpload(upload.key)} aria-label="Dismiss" title="Dismiss">
            <CloseIcon width={15} height={15} />
          </button>
        </div>
      )}
    </li>
  );
}

export function DocumentsPanel() {
  const { documents, loaded, loadError, uploads, setPanelOpen, refresh, enqueue, remove } = useDocuments();
  const [dragging, setDragging] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DocumentRecord | null>(null);
  const [duplicates, setDuplicates] = useState<{ all: File[]; dupes: string[] } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogOpen = pendingDelete !== null || duplicates !== null;
  const dialogOpenRef = useRef(dialogOpen);
  dialogOpenRef.current = dialogOpen;

  useEffect(() => {
    void refresh();
    const onKey = (e: KeyboardEvent) => {
      // A confirm dialog handles its own Escape.
      if (e.key === "Escape" && !dialogOpenRef.current) setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [refresh, setPanelOpen]);

  // Re-uploading makes a second copy (ingest isn't idempotent), so ask first.
  function add(files: File[]) {
    if (files.length === 0) return;
    const taken = new Set([...documents.map((d) => d.source), ...uploads.filter((u) => u.status !== "failed").map((u) => u.file.name)]);
    const dupes = files.filter((f) => taken.has(f.name)).map((f) => f.name);
    if (dupes.length > 0) setDuplicates({ all: files, dupes });
    else enqueue(files);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    add([...e.dataTransfer.files]);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const doc = pendingDelete;
    setPendingDelete(null);
    const error = await remove(doc.id);
    setDeleteError(error ? `Couldn't delete ${doc.source}: ${error}` : null);
  }

  return (
    <>
      <div className="sheet-backdrop" onMouseDown={() => setPanelOpen(false)} />
      <aside
        className={dragging ? "sheet dragging" : "sheet"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="docs-title"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={onDrop}
      >
        <header className="sheet-head">
          <h2 id="docs-title">Documents</h2>
          <button className="icon-btn" onClick={() => setPanelOpen(false)} aria-label="Close documents">
            <CloseIcon />
          </button>
        </header>

        <div className="sheet-body">
          <button className="dropzone" onClick={() => inputRef.current?.click()}>
            <UploadIcon width={22} height={22} />
            <span className="dropzone-title">{dragging ? "Drop to add" : "Drop files here or click to browse"}</span>
            <span className="dropzone-sub">{SUPPORTED_EXTENSIONS.join(", ")} · up to 50 MB</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={SUPPORTED_EXTENSIONS.join(",")}
            hidden
            onChange={(e) => {
              add([...(e.target.files ?? [])]);
              e.target.value = ""; // allow choosing the same file again
            }}
          />

          {uploads.length > 0 && (
            <ul className="doc-list" aria-label="Uploads">
              {uploads.map((u) => (
                <UploadRow key={u.key} upload={u} />
              ))}
            </ul>
          )}

          {deleteError && (
            <div className="error-line" role="alert">
              <AlertIcon width={16} height={16} />
              <span>{deleteError}</span>
            </div>
          )}

          <h3 className="group-label">Indexed{loaded && documents.length > 0 ? ` · ${documents.length}` : ""}</h3>
          {loadError && !loaded ? (
            <div className="error-line" role="alert">
              <AlertIcon width={16} height={16} />
              <span>{loadError}</span>
              <button className="link-btn" onClick={() => void refresh()}>
                <RetryIcon width={14} height={14} /> Retry
              </button>
            </div>
          ) : loaded && documents.length === 0 ? (
            <p className="list-empty">No documents yet. Drop a file above to start.</p>
          ) : (
            <ul className="doc-list">
              {documents.map((d) => (
                <li key={d.id} className="doc-row">
                  <span className="doc-icon">
                    <FileIcon width={16} height={16} />
                  </span>
                  <div className="doc-text">
                    <span className="doc-name" title={d.source}>
                      {d.source}
                    </span>
                    <span className="doc-meta">
                      {d.chunkCount} chunks · {relativeDate(d.ingestedAt)}
                    </span>
                  </div>
                  <div className="doc-actions">
                    <button className="icon-btn icon-btn-sm" onClick={() => setPendingDelete(d)} aria-label={`Delete ${d.source}`} title="Delete">
                      <TrashIcon width={15} height={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete document?"
          confirmLabel="Delete"
          danger
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        >
          <p>
            <strong>{pendingDelete.source}</strong> will be removed from the index. Answers will stop using it; past
            answers keep their text.
          </p>
        </ConfirmDialog>
      )}

      {duplicates && (
        <ConfirmDialog
          title="Upload again?"
          confirmLabel="Upload anyway"
          onConfirm={() => {
            enqueue(duplicates.all);
            setDuplicates(null);
          }}
          onCancel={() => {
            const fresh = duplicates.all.filter((f) => !duplicates.dupes.includes(f.name));
            if (fresh.length > 0) enqueue(fresh);
            setDuplicates(null);
          }}
        >
          <p>
            <strong>{duplicates.dupes.join(", ")}</strong> {duplicates.dupes.length === 1 ? "is" : "are"} already indexed.
            Uploading again adds a second copy.
            {duplicates.all.length > duplicates.dupes.length && " Cancel uploads only the new files."}
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
