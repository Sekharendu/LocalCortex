import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import * as api from "../api";
import { getHealth } from "../api";
import { arrangeChats, DEFAULT_VIEW, type ChatListView } from "../lib/groups";
import { chatPath, spacePath } from "../lib/route";
import { useChat } from "../state/chat";
import { useDocuments } from "../state/documents";
import type { ConversationSummary, Health, Space } from "../types";
import {
  CheckIcon,
  ChevronIcon,
  CloseIcon,
  FilterIcon,
  LibraryIcon,
  MoreIcon,
  PencilIcon,
  PlusIcon,
  SpaceIcon,
  TrashIcon,
} from "./Icons";
import { Menu, MenuHeading } from "./Menu";
import { ConfirmDialog, NameDialog } from "./Modal";

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

function FilesButton() {
  const { spaceId, documents, loaded, uploads, setPanelOpen } = useDocuments();
  const indexing = uploads.some((u) => u.spaceId === spaceId && (u.status === "indexing" || u.status === "queued"));
  if (!spaceId) return null;
  return (
    <button className="docs-btn" onClick={() => setPanelOpen(true)}>
      <LibraryIcon width={16} height={16} />
      <span className="docs-btn-label">Files in this Space</span>
      {indexing ? (
        <span className="docs-btn-meta">
          <span className="spinner spinner-sm" aria-hidden="true" /> Indexing…
        </span>
      ) : (
        loaded && <span className="docs-btn-meta">{documents.length}</span>
      )}
    </button>
  );
}

// Per-browser sidebar preferences. Storage can be unavailable (private windows), so
// every read and write is allowed to fail.
const VIEWS_KEY = "localcortex.chatViews";
const COLLAPSED_KEY = "localcortex.collapsedSpaces";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // preferences just won't survive a reload
  }
}

/** Follows a link in-app unless the user asked for a new tab. */
function inApp(e: MouseEvent, go: () => void) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  go();
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

  function finish(saveIt: boolean) {
    if (settled.current) return;
    settled.current = true;
    const title = draft.trim();
    setEditing(false);
    if (saveIt && title && title !== chat.title) onRename(title);
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
        href={chatPath(chat.spaceId, chat.id)}
        onClick={(e) => inApp(e, onOpen)}
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

function ViewOption({ selected, label, onSelect }: { selected: boolean; label: string; onSelect(): void }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={selected} className="menu-item" onClick={onSelect}>
      <span className="menu-label">{label}</span>
      {selected && <CheckIcon width={15} height={15} />}
    </button>
  );
}

interface SpaceSectionProps {
  space: Space;
  chats: ConversationSummary[];
  active: boolean;
  activeChatId: string | null;
  collapsed: boolean;
  view: ChatListView;
  onToggle(): void;
  onView(view: ChatListView): void;
  onNavigate(path: string): void;
  onRename(): void;
  onDelete(): void;
  onDeleteChat(chat: ConversationSummary): void;
}

function SpaceSection(props: SpaceSectionProps) {
  const { space, chats, active, activeChatId, collapsed, view, onToggle, onView, onNavigate } = props;
  const { stream, rename } = useChat();
  const groups = useMemo(() => arrangeChats(chats, view), [chats, view]);

  return (
    <section className={active ? "space active" : "space"}>
      <div className="space-head">
        <button className="space-toggle" onClick={onToggle} aria-expanded={!collapsed} aria-label={collapsed ? `Show chats in ${space.name}` : `Hide chats in ${space.name}`}>
          <ChevronIcon width={14} height={14} className={collapsed ? "chevron" : "chevron open"} />
        </button>
        <a className="space-name" href={spacePath(space.id)} onClick={(e) => inApp(e, () => onNavigate(spacePath(space.id)))} title={space.name}>
          <SpaceIcon width={15} height={15} />
          <span>{space.name}</span>
        </a>
        <div className="space-actions">
          <Menu label="Sort and group chats" icon={<FilterIcon width={15} height={15} />}>
            {(close) => (
              <>
                <MenuHeading>Sort by</MenuHeading>
                <ViewOption selected={view.sort === "updated"} label="Recent activity" onSelect={() => (onView({ ...view, sort: "updated" }), close())} />
                <ViewOption selected={view.sort === "created"} label="Date created" onSelect={() => (onView({ ...view, sort: "created" }), close())} />
                <MenuHeading>Show</MenuHeading>
                <ViewOption selected={view.group === "date"} label="Grouped by date" onSelect={() => (onView({ ...view, group: "date" }), close())} />
                <ViewOption selected={view.group === "flat"} label="One list" onSelect={() => (onView({ ...view, group: "flat" }), close())} />
              </>
            )}
          </Menu>
          <Menu label={`${space.name} options`} icon={<MoreIcon width={15} height={15} />}>
            {(close) => (
              <>
                <button type="button" role="menuitem" className="menu-item" onClick={() => (close(), props.onRename())}>
                  <PencilIcon width={15} height={15} /> <span className="menu-label">Rename Space</span>
                </button>
                <button type="button" role="menuitem" className="menu-item danger" onClick={() => (close(), props.onDelete())}>
                  <TrashIcon width={15} height={15} /> <span className="menu-label">Delete Space</span>
                </button>
              </>
            )}
          </Menu>
          <button className="icon-btn icon-btn-sm" aria-label={`New chat in ${space.name}`} title="New chat" onClick={() => onNavigate(spacePath(space.id))}>
            <PlusIcon width={15} height={15} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-chats">
          {chats.length === 0 && <p className="list-empty">No chats yet.</p>}
          {groups.map((g) => (
            <div key={g.label || "all"}>
              {g.label && <h3 className="group-label">{g.label}</h3>}
              <ul>
                {g.chats.map((c) => (
                  <ChatItem
                    key={c.id}
                    chat={c}
                    active={c.id === activeChatId}
                    streaming={stream?.conversationId === c.id}
                    onOpen={() => onNavigate(chatPath(space.id, c.id))}
                    onRename={(title) => void rename(c.id, title)}
                    onDelete={() => props.onDeleteChat(c)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

interface SidebarProps {
  activeSpaceId: string | null;
  activeChatId: string | null;
  open: boolean;
  onClose(): void;
  onNavigate(path: string, opts?: { replace?: boolean }): void;
  onNewSpace(): void;
}

type SpaceDelete = { space: Space; chats: number; documents: number };

export function Sidebar({ activeSpaceId, activeChatId, open, onClose, onNavigate, onNewSpace }: SidebarProps) {
  const { spaces, chats, remove, renameSpace, removeSpace, setNotice } = useChat();
  const [views, setViews] = useState<Record<string, ChatListView>>(() => load(VIEWS_KEY, {}));
  const [collapsed, setCollapsed] = useState<string[]>(() => load(COLLAPSED_KEY, []));
  const [pendingDelete, setPendingDelete] = useState<ConversationSummary | null>(null);
  const [renaming, setRenaming] = useState<Space | null>(null);
  const [deletingSpace, setDeletingSpace] = useState<SpaceDelete | null>(null);
  const [spaceDeleteBusy, setSpaceDeleteBusy] = useState(false);

  const chatsBySpace = useMemo(() => {
    const by = new Map<string, ConversationSummary[]>();
    for (const c of chats) by.set(c.spaceId, [...(by.get(c.spaceId) ?? []), c]);
    return by;
  }, [chats]);

  function setView(spaceId: string, view: ChatListView) {
    const next = { ...views, [spaceId]: view };
    setViews(next);
    save(VIEWS_KEY, next);
  }

  function toggle(spaceId: string) {
    const next = collapsed.includes(spaceId) ? collapsed.filter((id) => id !== spaceId) : [...collapsed, spaceId];
    setCollapsed(next);
    save(COLLAPSED_KEY, next);
  }

  async function confirmDeleteChat() {
    if (!pendingDelete) return;
    const { id, spaceId } = pendingDelete;
    setPendingDelete(null);
    await remove(id);
    if (id === activeChatId) onNavigate(spacePath(spaceId));
  }

  // Ask with fresh counts: the list's counts can be behind uploads made since.
  async function askDeleteSpace(space: Space) {
    try {
      const fresh = await api.getSpace(space.id);
      setDeletingSpace({ space, chats: fresh.chatCount, documents: fresh.documentCount });
    } catch {
      setDeletingSpace({ space, chats: chatsBySpace.get(space.id)?.length ?? space.chatCount, documents: space.documentCount });
    }
  }

  async function confirmDeleteSpace() {
    if (!deletingSpace || spaceDeleteBusy) return;
    const { space } = deletingSpace;
    setSpaceDeleteBusy(true);
    const error = await removeSpace(space.id);
    setSpaceDeleteBusy(false);
    setDeletingSpace(null);
    if (error) {
      setNotice(`Couldn't delete ${space.name}: ${error}`);
      return;
    }
    if (space.id === activeSpaceId) onNavigate("/", { replace: true });
  }

  const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

  return (
    <>
      <aside className={open ? "sidebar open" : "sidebar"} aria-label="Spaces and chats">
        <div className="sidebar-head">
          <a className="brand" href="/" onClick={(e) => inApp(e, () => onNavigate("/"))}>
            <span className="brand-mark" aria-hidden="true" />
            LocalCortex
          </a>
          <button className="icon-btn drawer-close" onClick={onClose} aria-label="Close sidebar">
            <CloseIcon />
          </button>
        </div>

        <button className="new-chat" onClick={onNewSpace}>
          <PlusIcon width={16} height={16} />
          New Space
        </button>

        <nav className="chat-list">
          <h3 className="group-label spaces-label">Spaces</h3>
          {spaces.map((s) => (
            <SpaceSection
              key={s.id}
              space={s}
              chats={chatsBySpace.get(s.id) ?? []}
              active={s.id === activeSpaceId}
              activeChatId={activeChatId}
              collapsed={collapsed.includes(s.id)}
              view={views[s.id] ?? DEFAULT_VIEW}
              onToggle={() => toggle(s.id)}
              onView={(v) => setView(s.id, v)}
              onNavigate={onNavigate}
              onRename={() => setRenaming(s)}
              onDelete={() => void askDeleteSpace(s)}
              onDeleteChat={setPendingDelete}
            />
          ))}
        </nav>

        <div className="sidebar-foot">
          <FilesButton />
          <HealthStatus />
        </div>
      </aside>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete chat?"
          confirmLabel="Delete"
          danger
          onConfirm={() => void confirmDeleteChat()}
          onCancel={() => setPendingDelete(null)}
        >
          <p>
            <strong>{pendingDelete.title}</strong> and all its messages will be deleted. This can't be undone.
          </p>
        </ConfirmDialog>
      )}

      {renaming && (
        <NameDialog
          title="Rename Space"
          label="Name"
          initial={renaming.name}
          confirmLabel="Rename"
          onSubmit={async (name) => {
            if (name !== renaming.name) await renameSpace(renaming.id, name);
            setRenaming(null);
            return null;
          }}
          onCancel={() => setRenaming(null)}
        />
      )}

      {deletingSpace && (
        <ConfirmDialog
          title="Delete Space?"
          confirmLabel={spaceDeleteBusy ? "Deleting…" : "Delete Space"}
          danger
          onConfirm={() => void confirmDeleteSpace()}
          onCancel={() => !spaceDeleteBusy && setDeletingSpace(null)}
        >
          <p>
            <strong>{deletingSpace.space.name}</strong> will be deleted with its{" "}
            {plural(deletingSpace.chats, "chat")} and {plural(deletingSpace.documents, "file")}. The files are removed from
            search too. This can't be undone.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
