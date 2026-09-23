import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUpIcon, StopIcon } from "./Icons";

const MAX_HEIGHT = 200;

interface ComposerProps {
  onSend(content: string): void;
  onStop?(): void;
  /** An answer is streaming in this chat: the button becomes Stop. */
  streaming?: boolean;
  /** Why sending is unavailable right now, shown as the placeholder. */
  disabledReason?: string | null;
  /** Changing this refocuses the input (e.g. when switching chats). */
  focusKey?: string;
}

export function Composer({ onSend, onStop, streaming = false, disabledReason = null, focusKey }: ComposerProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !streaming && !disabledReason;

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
        placeholder={disabledReason ?? "Ask about your documents"}
        aria-label="Message"
      />
      {streaming ? (
        <button type="button" className="send-btn" onClick={onStop} aria-label="Stop answering" title="Stop">
          <StopIcon />
        </button>
      ) : (
        <button type="submit" className="send-btn" disabled={!canSend} aria-label="Send" title="Send (Enter)">
          <ArrowUpIcon />
        </button>
      )}
    </form>
  );
}
