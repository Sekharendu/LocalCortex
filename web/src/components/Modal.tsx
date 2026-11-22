import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

interface NameProps {
  title: string;
  label: string;
  initial?: string;
  confirmLabel: string;
  maxLength?: number;
  /** Resolves to an error to show, or null when done (the dialog then closes itself via onCancel/unmount). */
  onSubmit(name: string): Promise<string | null>;
  onCancel(): void;
}

/** Asks for a name (new Space, rename Space). Escape or a backdrop click cancels. */
export function NameDialog({ title, label, initial = "", confirmLabel, maxLength = 80, onSubmit, onCancel }: NameProps) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.select();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const name = value.trim();
    if (!name || busy) return;
    setBusy(true);
    const problem = await onSubmit(name);
    setBusy(false);
    if (problem) setError(problem);
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onSubmit={(e) => void submit(e)}>
        <h2 id="modal-title">{title}</h2>
        <div className="modal-body">
          <label className="field">
            <span>{label}</span>
            <input ref={inputRef} value={value} maxLength={maxLength} onChange={(e) => setValue(e.target.value)} />
          </label>
          {error && <p className="field-error">{error}</p>}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!value.trim() || busy}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

interface ConfirmProps {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

/** A small confirmation dialog. Escape or a backdrop click cancels. */
export function ConfirmDialog({ title, children, confirmLabel, danger, onConfirm, onCancel }: ConfirmProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  // Runs once per opening: focus the action, restore focus to the opener on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">{title}</h2>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button ref={confirmRef} className={danger ? "btn btn-danger" : "btn btn-primary"} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
