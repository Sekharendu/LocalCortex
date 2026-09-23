import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import * as api from "../api";
import { ApiError } from "../api";
import { splitErrorFooter } from "../lib/format";
import type { Citation, Conversation, ConversationSummary, Message } from "../types";

export type LoadState = "loading" | "ready" | "notfound" | "error";

/**
 * The answer currently being streamed. It lives here, not in the chat view, so switching
 * chats mid-answer doesn't cancel it (llama3 on CPU can take 30s+ just to start). Only
 * one runs at a time: Ollama answers one request at a time anyway.
 */
export interface ActiveStream {
  conversationId: string;
  text: string;
  citations: Citation[];
  startedAt: number;
  firstTokenAt: number | null;
}

interface ChatStore {
  chats: ConversationSummary[];
  chatsLoaded: boolean;
  conversations: Record<string, Conversation>;
  loadState: Record<string, LoadState>;
  loadError: Record<string, string>;
  stream: ActiveStream | null;
  /** Sends that failed without the server saving an error reply (e.g. API unreachable). */
  failures: Record<string, string>;
  notice: string | null;
  setNotice(notice: string | null): void;
  refreshChats(): Promise<void>;
  open(id: string): Promise<void>;
  create(): Promise<Conversation>;
  send(id: string, content: string): Promise<void>;
  retry(id: string): void;
  stop(): void;
  rename(id: string, title: string): Promise<void>;
  remove(id: string): Promise<void>;
}

const ChatContext = createContext<ChatStore | null>(null);

export function useChat(): ChatStore {
  const store = useContext(ChatContext);
  if (!store) throw new Error("useChat must be used inside <ChatProvider>");
  return store;
}

const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

let localIds = 0;
function localMessage(role: Message["role"], content: string, extra: Partial<Message> = {}): Message {
  return {
    id: `local-${++localIds}`,
    role,
    content,
    citations: null,
    status: null,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record;
  const { [key]: _, ...rest } = record;
  return rest;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<ConversationSummary[]>([]);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [loadState, setLoadState] = useState<Record<string, LoadState>>({});
  const [loadError, setLoadError] = useState<Record<string, string>>({});
  const [stream, setStream] = useState<ActiveStream | null>(null);
  const [failures, setFailures] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  // Read inside callbacks so they can stay stable (no re-subscribing effects per token).
  const streamRef = useRef<{ conversationId: string; controller: AbortController } | null>(null);
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  const appendLocal = useCallback((id: string, message: Message) => {
    setConversations((all) => {
      const c = all[id];
      return c ? { ...all, [id]: { ...c, messages: [...c.messages, message] } } : all;
    });
  }, []);

  const refreshChats = useCallback(async () => {
    try {
      setChats(await api.listConversations());
      setChatsLoaded(true);
    } catch (e) {
      setNotice(messageOf(e));
    }
  }, []);

  const open = useCallback(async (id: string) => {
    // Mid-stream the local copy is ahead of the server's; don't overwrite it.
    if (streamRef.current?.conversationId === id) return;
    setLoadState((s) => (s[id] === "ready" ? s : { ...s, [id]: "loading" }));
    try {
      const c = await api.getConversation(id);
      if (streamRef.current?.conversationId === id) return;
      setConversations((all) => ({ ...all, [id]: c }));
      setLoadState((s) => ({ ...s, [id]: "ready" }));
    } catch (e) {
      const notFound = e instanceof ApiError && e.status === 404;
      setLoadState((s) => ({ ...s, [id]: notFound ? "notfound" : "error" }));
      setLoadError((s) => ({ ...s, [id]: messageOf(e) }));
    }
  }, []);

  const create = useCallback(async () => {
    const c = await api.createConversation();
    setConversations((all) => ({ ...all, [c.id]: c }));
    setLoadState((s) => ({ ...s, [c.id]: "ready" }));
    const { messages: _, ...summary } = c;
    setChats((list) => [summary, ...list]);
    return c;
  }, []);

  const send = useCallback(
    async (id: string, content: string) => {
      if (streamRef.current) return;
      const controller = new AbortController();
      streamRef.current = { conversationId: id, controller };
      setFailures((f) => without(f, id));
      appendLocal(id, localMessage("user", content));
      setStream({ conversationId: id, text: "", citations: [], startedAt: Date.now(), firstTokenAt: null });

      let text = "";
      let citations: Citation[] = [];
      let failed: string | null = null;
      try {
        const res = await api.sendMessage(id, content, controller.signal);
        citations = res.citations;
        setStream((s) => s && { ...s, citations });
        void refreshChats(); // the server titles a new chat before it starts streaming
        for await (const token of res.tokens) {
          text += token;
          setStream((s) => s && { ...s, text, firstTokenAt: s.firstTokenAt ?? Date.now() });
        }
      } catch (e) {
        if (!controller.signal.aborted) failed = messageOf(e);
      }

      if (controller.signal.aborted) {
        // The server saves the partial answer as interrupted once it sees the disconnect.
        // Mirror that locally instead of racing the save with a refetch.
        appendLocal(id, localMessage("assistant", splitErrorFooter(text).text, { citations, status: "interrupted" }));
      } else {
        try {
          const fresh = await api.getConversation(id);
          setConversations((all) => ({ ...all, [id]: fresh }));
          const last = fresh.messages.at(-1);
          const savedError = last?.role === "assistant" && last.status === "error";
          if (failed && !savedError) setFailures((f) => ({ ...f, [id]: failed }));
        } catch (e) {
          if (text) appendLocal(id, localMessage("assistant", splitErrorFooter(text).text, { citations }));
          setFailures((f) => ({ ...f, [id]: failed ?? messageOf(e) }));
        }
      }
      streamRef.current = null;
      setStream(null);
      void refreshChats();
    },
    [appendLocal, refreshChats],
  );

  const retry = useCallback(
    (id: string) => {
      const lastQuestion = conversationsRef.current[id]?.messages.findLast((m) => m.role === "user");
      if (lastQuestion) void send(id, lastQuestion.content);
    },
    [send],
  );

  const stop = useCallback(() => streamRef.current?.controller.abort(), []);

  const rename = useCallback(
    async (id: string, title: string) => {
      const retitle = <T extends ConversationSummary>(c: T): T => (c.id === id ? { ...c, title } : c);
      setChats((list) => list.map(retitle));
      setConversations((all) => (all[id] ? { ...all, [id]: retitle(all[id]) } : all));
      try {
        await api.renameConversation(id, title);
      } catch (e) {
        setNotice(`Couldn't rename the chat: ${messageOf(e)}`);
        void refreshChats();
      }
    },
    [refreshChats],
  );

  const remove = useCallback(async (id: string) => {
    if (streamRef.current?.conversationId === id) streamRef.current.controller.abort();
    try {
      await api.deleteConversation(id);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 404)) {
        setNotice(`Couldn't delete the chat: ${messageOf(e)}`);
        return;
      }
    }
    setChats((list) => list.filter((c) => c.id !== id));
    setConversations((all) => without(all, id));
    setLoadState((s) => without(s, id));
  }, []);

  const store = useMemo<ChatStore>(
    () => ({
      chats,
      chatsLoaded,
      conversations,
      loadState,
      loadError,
      stream,
      failures,
      notice,
      setNotice,
      refreshChats,
      open,
      create,
      send,
      retry,
      stop,
      rename,
      remove,
    }),
    [chats, chatsLoaded, conversations, loadState, loadError, stream, failures, notice, refreshChats, open, create, send, retry, stop, rename, remove],
  );

  return <ChatContext.Provider value={store}>{children}</ChatContext.Provider>;
}
