import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { getHealth } from "../api";
import { groupByRecency } from "../lib/groups";
import { useChat } from "../state/chat";
import type { ConversationSummary, Health } from "../types";
import { CloseIcon, NewChatIcon, PencilIcon, TrashIcon } from "./Icons";
import { ConfirmDialog } from "./Modal";

const HEALTH_POLL_MS = 30_000;

function useHealth(): Health | "unreachable" | null {
  const [health, setHealth] = useState<Health | "unreachable" | null>(null);
  useEffect(() => {
    let alive = true;
    const check = () =>
      getHealth().then(
        (h) => alive && setHealth(h),
        () => alive && setHealth("unreachable"),
      );
    void check();
    const t = setInterval(check, HEALTH_POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return health;
}

function HealthStatus() {
  const health = useHealth();
  if (health === null) return null;
  const down =
    health === "unreachable"
      ? ["API"]
      : (["ollama", "qdrant", "postgres"] as const).filter((k) => !health[k]).map((k) => k[0].toUpperCase() + k.slice(1));
  const ok = down.length === 0;
  return (
    <div className="health" role="status" title={ok ? "Ollama, Qdrant and Postgres are reachable" : `Unreachable: ${down.join(", ")}`}>
      <span className={ok ? "health-dot ok" : "health-dot down"} />
      {ok ? "All services running" : `${down.join(", ")} unreachable`}
    </div>
  );
}

interface ChatItemProps {
  chat: ConversationSummary;
  active: boolean;
  streaming: boolean;
  onOpen(): void;
  onRename(title: string): void;
  onDelete(): void;
}

function ChatItem({ chat, active, streaming, onOpen, onRename, onDelete }: ChatItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Enter commits and unmounts the input, which can fire blur too; act only once.
  const settled = useRef(false);

  useEffect(() => {
    if (editing) {
      settled.current = false;
      inputRef.current?.select();
    }
  }, [editing]);

  function finish(save: boolean) {
    if (settled.current) return;
    settled.current = true;
    const title = draft.trim();
    setEditing(false);
    if (save && title && title !== chat.title) onRename(title);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  }

  if (editing) {
    return (
      <li className="chat-item editing">
        <input
          ref={inputRef}
          value={draft}
          maxLength={120}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => finish(true)}
          aria-label="Chat title"
        />
      </li>
    );
  }

  return (
    <li className={active ? "chat-item active" : "chat-item"}>
      <a
        href={`/c/${chat.id}`}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let the browser open a new tab
          e.preventDefault();
          onOpen();
        }}
        aria-current={active ? "page" : undefined}
        title={chat.title}
      >
        <span className="chat-title">{chat.title}</span>
        {streaming && <span className="chat-live" aria-label="Answering" />}
      </a>
      <div className="chat-actions">
        <button
          className="icon-btn icon-btn-sm"
          aria-label={`Rename "${chat.title}"`}
          title="Rename"
          onClick={() => {
            setDraft(chat.title);
            setEditing(true);
          }}
        >
          <PencilIcon width={15} height={15} />
        </button>
        <button className="icon-btn icon-btn-sm" aria-label={`Delete "${chat.title}"`} title="Delete" onClick={onDelete}>
          <TrashIcon width={15} height={15} />
        </button>
      </div>
    </li>
  );
}

interface SidebarProps {
  activeId: string | null;
  open: boolean;
  onClose(): void;
  onNavigate(path: string): void;
}

export function Sidebar({ activeId, open, onClose, onNavigate }: SidebarProps) {
  const { chats, chatsLoaded, stream, rename, remove } = useChat();
  const groups = useMemo(() => groupByRecency(chats), [chats]);
  const [pendingDelete, setPendingDelete] = useState<ConversationSummary | null>(null);

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    await remove(id);
    if (id === activeId) onNavigate("/");
  }

  return (
    <>
      <aside className={open ? "sidebar open" : "sidebar"} aria-label="Chats">
        <div className="sidebar-head">
          <a
            className="brand"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate("/");
            }}
          >
            <span className="brand-mark" aria-hidden="true" />
            LocalCortex
          </a>
          <button className="icon-btn drawer-close" onClick={onClose} aria-label="Close sidebar">
            <CloseIcon />
          </button>
        </div>

        <button className="new-chat" onClick={() => onNavigate("/")}>
          <NewChatIcon width={16} height={16} />
          New chat
        </button>

        <nav className="chat-list">
          {chatsLoaded && chats.length === 0 && <p className="list-empty">Your chats will appear here.</p>}
          {groups.map((g) => (
            <section key={g.label}>
              <h3 className="group-label">{g.label}</h3>
              <ul>
                {g.chats.map((c) => (
                  <ChatItem
                    key={c.id}
                    chat={c}
                    active={c.id === activeId}
                    streaming={stream?.conversationId === c.id}
                    onOpen={() => onNavigate(`/c/${c.id}`)}
                    onRename={(title) => void rename(c.id, title)}
                    onDelete={() => setPendingDelete(c)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </nav>

        <div className="sidebar-foot">
          <HealthStatus />
        </div>
      </aside>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete chat?"
          confirmLabel="Delete"
          danger
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        >
          <p>
            <strong>{pendingDelete.title}</strong> and all its messages will be deleted. This can't be undone.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
