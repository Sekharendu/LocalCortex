import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { AnswerModel } from "../types";
import { CheckIcon, ChevronDownIcon, StopIcon } from "./Icons";

interface ModelPickerProps {
  models: AnswerModel[];
  value: string;
  onChange(key: string): void;
}

/** The answer-model button and its menu (opens upwards, above the composer). */
function ModelPicker({ models, value, onChange }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = models.find((m) => m.key === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (models.length === 0) return null;
  return (
    <div className="model-picker" ref={rootRef}>
      <button
        type="button"
        className="model-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Answer model"
        onClick={() => setOpen((o) => !o)}
      >
        {current?.label ?? value}
        <ChevronDownIcon width={14} height={14} />
      </button>
      {open && (
        <div className="menu model-menu" role="menu">
          {models.map((m) => (
            <button
              key={m.key}
              type="button"
              role="menuitemradio"
              aria-checked={m.key === value}
              className="menu-item"
              onClick={() => {
                onChange(m.key);
                setOpen(false);
              }}
            >
              <span className="menu-text">
                <span className="menu-label">{m.label}</span>
                <span className="menu-desc">{m.description}</span>
              </span>
              {m.key === value && <CheckIcon width={15} height={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const MAX_HEIGHT = 200;

interface ComposerProps {
  onSend(content: string): void;
  onStreamAction?(): void;
  streamPhase?: "receiving" | "revealing" | "finishing";
  /** Why sending is unavailable right now, shown as the placeholder. */
  disabledReason?: string | null;
  /** Changing this refocuses the input (e.g. when switching chats). */
  focusKey?: string;
  /** The answer model picker; hidden when no models are given. */
  models?: AnswerModel[];
  model?: string;
  onModelChange?(key: string): void;
}

export function Composer({ onSend, onStreamAction, streamPhase, disabledReason = null, focusKey, models = [], model, onModelChange }: ComposerProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !streamPhase && !disabledReason;

  // Grow with the text up to MAX_HEIGHT, then scroll inside.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  useEffect(() => {
    // Skip on touch screens, where focusing pops the keyboard over the chat.
    if (window.matchMedia("(pointer: fine)").matches) ref.current?.focus();
  }, [focusKey]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // isComposing: Enter confirming an IME candidate must not send.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={disabledReason ?? "Ask localcortex anything about your documents..."}
        aria-label="Message"
      />
      <div className="composer-actions">
        {model && onModelChange && <ModelPicker models={models} value={model} onChange={onModelChange} />}
        {!streamPhase && !disabledReason && (
          <span className="composer-hint" aria-hidden="true">
            ↵ send · ⇧↵ new line
          </span>
        )}
        {streamPhase === "receiving" ? (
          <button type="button" className="send-btn" onClick={onStreamAction} aria-label="Stop answering" title="Stop">
            <StopIcon />
          </button>
        ) : streamPhase === "revealing" ? (
          <button type="button" className="send-btn reveal-btn" onClick={onStreamAction}>
            Show full answer
          </button>
        ) : (
          <button type="submit" className="send-btn" disabled={!canSend} aria-label="Send" title="Send (Enter)">
            <span aria-hidden="true">↗</span>
          </button>
        )}
      </div>
    </form>
  );
}
