import { memo, useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { citationLabel, splitErrorFooter } from "../lib/format";
import type { ActiveStream } from "../state/chat";
import type { Citation, Message } from "../types";
import { AlertIcon, CheckIcon, CopyIcon, FileIcon, RetryIcon } from "./Icons";

const Answer = memo(function Answer({ text }: { text: string }) {
  return (
    <div className="markdown">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{ a: ({ node: _, ...props }) => <a {...props} target="_blank" rel="noreferrer" /> }}
      >
        {text}
      </Markdown>
    </div>
  );
});

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      className="icon-btn icon-btn-sm"
      aria-label={copied ? "Copied" : "Copy answer"}
      title={copied ? "Copied" : "Copy"}
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => setCopied(true), () => {});
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

function Citations({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <ul className="citations" aria-label="Sources">
      {citations.map((c) => (
        <li key={`${c.source}#${c.page ?? ""}`} className="chip" title={c.source}>
          <FileIcon width={13} height={13} />
          {citationLabel(c)}
        </li>
      ))}
    </ul>
  );
}

function ErrorLine({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="error-line" role="alert">
      <AlertIcon width={16} height={16} />
      <span>{text}</span>
      {onRetry && (
        <button className="link-btn" onClick={onRetry}>
          <RetryIcon width={14} height={14} /> Retry
        </button>
      )}
    </div>
  );
}

interface MessageViewProps {
  message: Message;
  /** Offered on the last turn only. */
  onRetry?: () => void;
}

export const MessageView = memo(function MessageView({ message, onRetry }: MessageViewProps) {
  if (message.role === "user") {
    return (
      <div className="turn turn-user">
        <div className="bubble">{message.content}</div>
      </div>
    );
  }

  // A failure before streaming started is saved with the error text as its content and
  // no citations; one partway through keeps the partial answer.
  if (message.status === "error" && message.citations === null) {
    return (
      <div className="turn turn-assistant">
        <ErrorLine text={message.content || "Couldn't answer."} onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="turn turn-assistant">
      {message.content && <Answer text={message.content} />}
      {message.status === "interrupted" && <p className="muted-note">Stopped</p>}
      {message.status === "error" && <ErrorLine text="The answer failed partway through." onRetry={onRetry} />}
      {message.status === null && (
        <div className="answer-meta">
          <CopyButton text={message.content} />
          <Citations citations={message.citations ?? []} />
        </div>
      )}
    </div>
  );
});

function Thinking({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const seconds = Math.max(0, Math.floor((now - since) / 1000));
  return (
    <div className="thinking">
      <span className="thinking-dot" />
      Thinking…{seconds >= 2 && <span className="thinking-time">{seconds}s</span>}
    </div>
  );
}

/** The answer currently streaming in. */
export function LiveAnswer({ stream }: { stream: ActiveStream }) {
  const { text, error } = splitErrorFooter(stream.text);
  return (
    <div className="turn turn-assistant" aria-live="polite" aria-busy={!error}>
      {stream.firstTokenAt === null ? (
        <Thinking since={stream.startedAt} />
      ) : (
        <div className={error ? undefined : "streaming"}>
          <Answer text={text} />
        </div>
      )}
      {error && <ErrorLine text={error} />}
    </div>
  );
}

export { ErrorLine };
