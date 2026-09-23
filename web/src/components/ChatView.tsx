import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useChat } from "../state/chat";
import { useDocuments } from "../state/documents";
import { Composer } from "./Composer";
import { ArrowDownIcon } from "./Icons";
import { ErrorLine, LiveAnswer, MessageView } from "./Message";

const BUSY_ELSEWHERE = "Answering in another chat…";
// Within this many pixels of the bottom counts as "reading the latest".
const STICK_THRESHOLD = 80;

export function EmptyState({ onSend }: { onSend(content: string): void }) {
  const { stream } = useChat();
  const docs = useDocuments();
  const noDocuments = docs.loaded && docs.documents.length === 0;
  return (
    <div className="empty">
      <div className="empty-inner">
        <h1>What do you want to know?</h1>
        {noDocuments ? (
          <p className="empty-sub">
            There's nothing to search yet.{" "}
            <button className="link-btn" onClick={() => docs.setPanelOpen(true)}>
              Add a document
            </button>{" "}
            to get started.
          </p>
        ) : (
          <p className="empty-sub">Answers come from your documents, on this machine.</p>
        )}
        <Composer onSend={onSend} disabledReason={stream ? BUSY_ELSEWHERE : null} focusKey="new" />
      </div>
    </div>
  );
}

export function ChatView({ id, onNewChat }: { id: string; onNewChat(): void }) {
  const { conversations, loadState, loadError, stream, failures, send, retry, stop, open } = useChat();
  const conversation = conversations[id];
  const live = stream?.conversationId === id ? stream : null;

  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [atBottom, setAtBottom] = useState(true);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Opening a chat starts at the latest message.
  useLayoutEffect(() => {
    stick.current = true;
    setAtBottom(true);
    scrollToBottom();
  }, [id, conversation !== undefined, scrollToBottom]);

  // Follow new content only while the reader is at the bottom, so scrolling up to
  // reread isn't yanked away by incoming tokens.
  useLayoutEffect(() => {
    if (stick.current) scrollToBottom();
  }, [conversation?.messages.length, live?.text, live?.firstTokenAt, failures[id], scrollToBottom]);

  // Sending always jumps to the bottom.
  useEffect(() => {
    if (live) {
      stick.current = true;
      scrollToBottom();
    }
  }, [live?.startedAt, scrollToBottom]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD;
    stick.current = bottom;
    setAtBottom(bottom);
  }

  if (!conversation) {
    const state = loadState[id];
    if (state === "notfound") {
      return (
        <div className="empty">
          <div className="empty-inner">
            <h1>Chat not found</h1>
            <p className="empty-sub">It may have been deleted.</p>
            <button className="btn btn-primary" onClick={onNewChat}>
              New chat
            </button>
          </div>
        </div>
      );
    }
    if (state === "error") {
      return (
        <div className="empty">
          <div className="empty-inner">
            <ErrorLine text={loadError[id] ?? "Couldn't load this chat."} onRetry={() => void open(id)} />
          </div>
        </div>
      );
    }
    return <div className="empty" aria-busy="true" />;
  }

  const messages = conversation.messages;
  const last = messages.at(-1);
  const failure = failures[id];

  return (
    <>
      <div className="thread" ref={scrollRef} onScroll={onScroll}>
        <div className="thread-inner">
          {messages.map((m) => (
            <MessageView
              key={m.id}
              message={m}
              onRetry={!live && !failure && m === last && m.status === "error" ? () => retry(id) : undefined}
            />
          ))}
          {live && <LiveAnswer stream={live} />}
          {failure && !live && (
            <div className="turn turn-assistant">
              <ErrorLine text={failure} onRetry={() => retry(id)} />
            </div>
          )}
        </div>
      </div>
      <div className="composer-dock">
        {!atBottom && (
          <button className="jump-btn" onClick={() => scrollToBottom(true)} aria-label="Scroll to latest">
            <ArrowDownIcon width={16} height={16} />
          </button>
        )}
        <Composer
          onSend={(content) => void send(id, content)}
          onStop={stop}
          streaming={live !== null}
          disabledReason={stream && !live ? BUSY_ELSEWHERE : null}
          focusKey={id}
        />
        <p className="disclaimer">Answers are grounded in your documents and can still be wrong.</p>
      </div>
    </>
  );
}
