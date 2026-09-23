import { useEffect, useState } from "react";
import { ChatView, EmptyState } from "./components/ChatView";
import { CloseIcon, MenuIcon, NewChatIcon } from "./components/Icons";
import { Sidebar } from "./components/Sidebar";
import { useRoute } from "./lib/route";
import { useChat } from "./state/chat";

export function App() {
  const { conversationId, navigate } = useRoute();
  const chat = useChat();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { refreshChats, open, create, send, setNotice } = chat;

  useEffect(() => {
    void refreshChats();
  }, [refreshChats]);

  useEffect(() => {
    if (conversationId) void open(conversationId);
    setDrawerOpen(false);
  }, [conversationId, open]);

  const title = conversationId ? chat.conversations[conversationId]?.title : undefined;
  useEffect(() => {
    document.title = title ? `${title} · LocalCortex` : "LocalCortex";
  }, [title]);

  // The chat is only created once there's something to put in it.
  async function startChat(content: string) {
    try {
      const c = await create();
      navigate(`/c/${c.id}`);
      void send(c.id, content);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="app">
      <Sidebar activeId={conversationId} open={drawerOpen} onClose={() => setDrawerOpen(false)} onNavigate={navigate} />
      {drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setDrawerOpen(true)} aria-label="Open sidebar">
            <MenuIcon />
          </button>
          <span className="topbar-title">{title ?? "LocalCortex"}</span>
          <button className="icon-btn" onClick={() => navigate("/")} aria-label="New chat">
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

        {conversationId ? (
          <ChatView key={conversationId} id={conversationId} onNewChat={() => navigate("/")} />
        ) : (
          <EmptyState onSend={(content) => void startChat(content)} />
        )}
      </main>
    </div>
  );
}
