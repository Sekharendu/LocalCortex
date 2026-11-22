import { useEffect, useState, type FormEvent } from "react";
import { ChatView, EmptyState } from "./components/ChatView";
import { DocumentsPanel } from "./components/DocumentsPanel";
import { CloseIcon, MenuIcon, NewChatIcon } from "./components/Icons";
import { NameDialog } from "./components/Modal";
import { Sidebar } from "./components/Sidebar";
import { chatPath, spacePath, useRoute } from "./lib/route";
import { useChat } from "./state/chat";
import { useDocuments } from "./state/documents";

const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Shown until the first Space exists: chats and files both live in a Space. */
function FirstSpace({ onCreate }: { onCreate(name: string): Promise<string | null> }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(await onCreate(name.trim()));
    setBusy(false);
  }

  return (
    <div className="empty">
      <form className="empty-inner first-space" onSubmit={(e) => void submit(e)}>
        <p className="new-chat-greeting">Welcome to LocalCortex</p>
        <h1>Create your first <span>Space</span></h1>
        <p className="empty-sub">
          A Space holds a set of files and the chats about them. Answers only use the files in the chat's own Space.
        </p>
        <div className="first-space-row">
          <input
            autoFocus
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Company handbook, Thesis research"
            aria-label="Space name"
          />
          <button type="submit" className="btn btn-primary" disabled={!name.trim() || busy}>
            Create Space
          </button>
        </div>
        {error && <p className="field-error">{error}</p>}
      </form>
    </div>
  );
}

export function App() {
  const route = useRoute();
  const { conversationId, navigate } = route;
  const chat = useChat();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newSpaceOpen, setNewSpaceOpen] = useState(false);
  const { refreshSpaces, refreshChats, open, create, send, setNotice, createSpace, spaces, spacesLoaded } = chat;
  const docs = useDocuments();
  const setDocsSpace = docs.setSpaceId;

  useEffect(() => {
    void refreshSpaces();
    void refreshChats();
  }, [refreshSpaces, refreshChats]);

  useEffect(() => {
    if (conversationId) void open(conversationId);
    setDrawerOpen(false);
  }, [conversationId, open]);

  const conversation = conversationId ? chat.conversations[conversationId] : undefined;
  // The chat's own Space wins over the URL's (an old /c/:id link has none).
  const spaceId = conversation?.spaceId ?? route.spaceId;
  const space = spaces.find((s) => s.id === spaceId);

  // Old /c/:id links (and /s/<wrong>/c/:id) move to the chat's real address.
  useEffect(() => {
    if (conversation && conversationId && route.spaceId !== conversation.spaceId) {
      navigate(chatPath(conversation.spaceId, conversationId), { replace: true });
    }
  }, [conversation, conversationId, route.spaceId, navigate]);

  // "/" opens the most recently active Space.
  useEffect(() => {
    if (route.path === "/" && spaces.length > 0) navigate(spacePath(spaces[0].id), { replace: true });
  }, [route.path, spaces, navigate]);

  useEffect(() => {
    setDocsSpace(space ? space.id : null);
  }, [space, setDocsSpace]);

  const title = conversation?.title ?? space?.name;
  useEffect(() => {
    document.title = title ? `${title} · LocalCortex` : "LocalCortex";
  }, [title]);

  async function addSpace(name: string): Promise<string | null> {
    try {
      const s = await createSpace(name);
      setNewSpaceOpen(false);
      navigate(spacePath(s.id));
      return null;
    } catch (e) {
      return messageOf(e);
    }
  }

  // The chat is only created once there's something to put in it.
  async function startChat(inSpace: string, content: string, model: string) {
    try {
      const c = await create(inSpace);
      navigate(chatPath(inSpace, c.id));
      void send(c.id, content, model);
    } catch (e) {
      setNotice(messageOf(e));
    }
  }

  let content;
  if (conversationId) {
    content = (
      <ChatView key={conversationId} id={conversationId} onNewChat={() => navigate(spaceId ? spacePath(spaceId) : "/")} />
    );
  } else if (!spacesLoaded) {
    content = <div className="empty" aria-busy="true" />;
  } else if (spaces.length === 0) {
    content = <FirstSpace onCreate={addSpace} />;
  } else if (!space) {
    content = (
      <div className="empty">
        <div className="empty-inner">
          <h1>Space not found</h1>
          <p className="empty-sub">It may have been deleted.</p>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Go to your Spaces
          </button>
        </div>
      </div>
    );
  } else {
    content = <EmptyState spaceName={space.name} onSend={(text, model) => void startChat(space.id, text, model)} />;
  }

  return (
    <div className="app">
      <Sidebar
        activeSpaceId={spaceId}
        activeChatId={conversationId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={navigate}
        onNewSpace={() => setNewSpaceOpen(true)}
      />
      {drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setDrawerOpen(true)} aria-label="Open sidebar">
            <MenuIcon />
          </button>
          <span className="topbar-title">{title ?? "LocalCortex"}</span>
          <button
            className="icon-btn"
            onClick={() => navigate(spaceId ? spacePath(spaceId) : "/")}
            aria-label="New chat"
            disabled={!spaceId}
          >
            <NewChatIcon />
          </button>
        </header>

        {chat.notice && (
          <div className="notice" role="alert">
            <span>{chat.notice}</span>
            <button className="icon-btn icon-btn-sm" onClick={() => setNotice(null)} aria-label="Dismiss">
              <CloseIcon width={15} height={15} />
            </button>
          </div>
        )}

        {content}
      </main>

      {docs.panelOpen && space && <DocumentsPanel />}

      {newSpaceOpen && (
        <NameDialog
          title="New Space"
          label="Name"
          confirmLabel="Create Space"
          onSubmit={addSpace}
          onCancel={() => setNewSpaceOpen(false)}
        />
      )}
    </div>
  );
}
