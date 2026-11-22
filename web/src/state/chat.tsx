import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as api from "../api";
import { ApiError } from "../api";
import { createAnswerReveal } from "../lib/answerReveal";
import { splitErrorFooter, streamingAnswerText } from "../lib/format";
import type { AnswerModel, Citation, Conversation, ConversationSummary, Message, Space } from "../types";

export type LoadState = "loading" | "ready" | "notfound" | "error";
type StreamPhase = "receiving" | "revealing" | "finishing";

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
  phase: StreamPhase;
}

interface StreamRequest {
  conversationId: string;
  controller: AbortController;
  reveal: ReturnType<typeof createAnswerReveal>;
  phase: StreamPhase;
}

interface ChatStore {
  spaces: Space[];
  spacesLoaded: boolean;
  /** Every Space's chats; filter by `spaceId`. */
  chats: ConversationSummary[];
  chatsLoaded: boolean;
  models: AnswerModel[];
  /** The model picked last (the server's default until the user picks one). */
  model: string;
  setModel(model: string): void;
  conversations: Record<string, Conversation>;
  loadState: Record<string, LoadState>;
  loadError: Record<string, string>;
  stream: ActiveStream | null;
  /** Sends that failed without the server saving an error reply (e.g. API unreachable). */
  failures: Record<string, string>;
  notice: string | null;
  setNotice(notice: string | null): void;
  refreshSpaces(): Promise<void>;
  createSpace(name: string): Promise<Space>;
  renameSpace(id: string, name: string): Promise<void>;
  /** Resolves to an error message, or null once the Space and everything in it are gone. */
  removeSpace(id: string): Promise<string | null>;
  refreshChats(): Promise<void>;
  open(id: string): Promise<void>;
  create(spaceId: string): Promise<Conversation>;
  send(id: string, content: string, model: string): Promise<void>;
  retry(id: string, model: string): void;
  actOnStream(): void;
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
    model: null,
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
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spacesLoaded, setSpacesLoaded] = useState(false);
  const [models, setModels] = useState<AnswerModel[]>([]);
  const [model, setModel] = useState("gemma-4-26b");
  const [chats, setChats] = useState<ConversationSummary[]>([]);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [loadState, setLoadState] = useState<Record<string, LoadState>>({});
  const [loadError, setLoadError] = useState<Record<string, string>>({});
  const [stream, setStream] = useState<ActiveStream | null>(null);
  const [failures, setFailures] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  // Read inside callbacks so they can stay stable (no re-subscribing effects per token).
  const streamRef = useRef<StreamRequest | null>(null);
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
  const chatsRef = useRef(chats);
  chatsRef.current = chats;

  useEffect(() => () => {
    const request = streamRef.current;
    streamRef.current = null;
    request?.reveal.cancel();
    request?.controller.abort();
  }, []);

  const appendLocal = useCallback((id: string, message: Message) => {
    setConversations((all) => {
      const c = all[id];
      return c ? { ...all, [id]: { ...c, messages: [...c.messages, message] } } : all;
    });
  }, []);

  const refreshSpaces = useCallback(async () => {
    try {
      setSpaces(await api.listSpaces());
      setSpacesLoaded(true);
    } catch (e) {
      setNotice(messageOf(e));
    }
  }, []);

  useEffect(() => {
    api.listModels().then(
      (m) => {
        setModels(m.models);
        setModel(m.default);
      },
      (e) => setNotice(`Couldn't load the answer models: ${messageOf(e)}`),
    );
  }, []);

  const createSpace = useCallback(async (name: string) => {
    const space = await api.createSpace(name);
    setSpaces((list) => [space, ...list]);
    return space;
  }, []);

  const renameSpace = useCallback(
    async (id: string, name: string) => {
      setSpaces((list) => list.map((s) => (s.id === id ? { ...s, name } : s)));
      try {
        await api.renameSpace(id, name);
      } catch (e) {
        setNotice(`Couldn't rename the Space: ${messageOf(e)}`);
        void refreshSpaces();
      }
    },
    [refreshSpaces],
  );

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

  const create = useCallback(async (spaceId: string) => {
    const c = await api.createConversation(spaceId);
    setConversations((all) => ({ ...all, [c.id]: c }));
    setLoadState((s) => ({ ...s, [c.id]: "ready" }));
    const { messages: _, ...summary } = c;
    setChats((list) => [summary, ...list]);
    setSpaces((list) => list.map((s) => (s.id === spaceId ? { ...s, chatCount: s.chatCount + 1 } : s)));
    return c;
  }, []);

  const send = useCallback(
    async (id: string, content: string, model: string) => {
      if (streamRef.current) return;
      const controller = new AbortController();
      const reveal = createAnswerReveal((text) => {
        if (streamRef.current !== active) return;
        const firstTokenAt = Date.now();
        setStream((s) => s && { ...s, text, firstTokenAt: s.firstTokenAt ?? firstTokenAt });
      });
      const active: StreamRequest = { conversationId: id, controller, reveal, phase: "receiving" };
      streamRef.current = active;
      const setPhase = (phase: StreamPhase) => {
        active.phase = phase;
        setStream((s) => s && { ...s, phase });
      };
      setFailures((f) => without(f, id));
      appendLocal(id, localMessage("user", content));
      setStream({ conversationId: id, text: "", citations: [], startedAt: Date.now(), firstTokenAt: null, phase: "receiving" });

      let text = "";
      let citations: Citation[] = [];
      let failed: string | null = null;
      try {
        try {
          const res = await api.sendMessage(id, content, model, controller.signal);
          if (streamRef.current !== active) return;
          citations = res.citations;
          setStream((s) => s && { ...s, citations });
          void refreshChats(); // the server titles a new chat before it starts streaming
          for await (const token of res.tokens) {
            if (controller.signal.aborted) break;
            text += token;
            reveal.update(streamingAnswerText(text));
          }
        } catch (e) {
          if (!controller.signal.aborted) failed = messageOf(e);
        }

        if (streamRef.current !== active) return;
        const answer = splitErrorFooter(text);
        const interrupted = controller.signal.aborted;
        const answerText = interrupted || failed !== null ? streamingAnswerText(answer.text) : answer.text;
        if (interrupted) {
          // The server saves the received partial answer after disconnect. Mirror it
          // locally instead of racing the save with a refetch.
          appendLocal(id, localMessage("assistant", answerText, { citations, status: "interrupted", model }));
          return;
        }

        if (failed !== null || answer.error !== null) {
          reveal.cancel();
          setStream((s) => s && { ...s, text: answer.error === null ? answerText : text });
        } else {
          reveal.update(text);
          if (reveal.pending) {
            setPhase("revealing");
            await reveal.drain();
            if (streamRef.current !== active) return;
          }
        }
        setPhase("finishing");

        try {
          const fresh = await api.getConversation(id, controller.signal);
          if (streamRef.current !== active) return;
          // Deleting this chat while the final GET is in flight must not restore it.
          setConversations((all) => all[id] ? { ...all, [id]: fresh } : all);
          const last = fresh.messages.at(-1);
          const savedError = last?.role === "assistant" && last.status === "error";
          const streamError = failed ?? answer.error;
          if (streamError && !savedError) setFailures((f) => ({ ...f, [id]: streamError }));
        } catch (e) {
          if (streamRef.current !== active) return;
          if (answerText) appendLocal(id, localMessage("assistant", answerText, { citations, model }));
          setFailures((f) => ({ ...f, [id]: failed ?? answer.error ?? messageOf(e) }));
        }
      } finally {
        reveal.cancel();
        if (streamRef.current === active) {
          streamRef.current = null;
          setStream(null);
          void refreshChats();
        }
      }
    },
    [appendLocal, refreshChats],
  );

  const retry = useCallback(
    (id: string, model: string) => {
      const lastQuestion = conversationsRef.current[id]?.messages.findLast((m) => m.role === "user");
      if (lastQuestion) void send(id, lastQuestion.content, model);
    },
    [send],
  );

  const actOnStream = useCallback(() => {
    const request = streamRef.current;
    if (request?.phase === "revealing") request.reveal.showAll();
    else if (request?.phase === "receiving") {
      request.reveal.cancel();
      request.controller.abort();
    }
  }, []);

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
    if (streamRef.current?.conversationId === id) actOnStream();
    try {
      await api.deleteConversation(id);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 404)) {
        setNotice(`Couldn't delete the chat: ${messageOf(e)}`);
        return;
      }
    }
    const request = streamRef.current;
    if (request?.conversationId === id) {
      streamRef.current = null;
      request.reveal.cancel();
      request.controller.abort();
      setStream(null);
    }
    const spaceId = conversationsRef.current[id]?.spaceId ?? chatsRef.current.find((c) => c.id === id)?.spaceId;
    setChats((list) => list.filter((c) => c.id !== id));
    setConversations((all) => without(all, id));
    setLoadState((s) => without(s, id));
    if (spaceId) setSpaces((list) => list.map((s) => (s.id === spaceId ? { ...s, chatCount: Math.max(0, s.chatCount - 1) } : s)));
  }, [actOnStream]);

  const removeSpace = useCallback(async (id: string) => {
    const request = streamRef.current;
    const inSpace = (chatId: string) =>
      (conversationsRef.current[chatId]?.spaceId ?? chatsRef.current.find((c) => c.id === chatId)?.spaceId) === id;
    try {
      await api.deleteSpace(id);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 404)) return messageOf(e);
    }
    // The server deleted the chat being answered; drop the stream instead of saving into nothing.
    if (request && streamRef.current === request && inSpace(request.conversationId)) {
      streamRef.current = null;
      request.reveal.cancel();
      request.controller.abort();
      setStream(null);
    }
    const keep = <T,>(record: Record<string, T>) => Object.fromEntries(Object.entries(record).filter(([k]) => !inSpace(k)));
    setChats((list) => list.filter((c) => c.spaceId !== id));
    setConversations((all) => keep(all));
    setLoadState((s) => keep(s));
    setFailures((f) => keep(f));
    setSpaces((list) => list.filter((s) => s.id !== id));
    return null;
  }, []);

  const store = useMemo<ChatStore>(
    () => ({
      spaces,
      spacesLoaded,
      chats,
      chatsLoaded,
      models,
      model,
      setModel,
      conversations,
      loadState,
      loadError,
      stream,
      failures,
      notice,
      setNotice,
      refreshSpaces,
      createSpace,
      renameSpace,
      removeSpace,
      refreshChats,
      open,
      create,
      send,
      retry,
      actOnStream,
      rename,
      remove,
    }),
    [spaces, spacesLoaded, chats, chatsLoaded, models, model, conversations, loadState, loadError, stream, failures, notice, refreshSpaces, createSpace, renameSpace, removeSpace, refreshChats, open, create, send, retry, actOnStream, rename, remove],
  );

  return <ChatContext.Provider value={store}>{children}</ChatContext.Provider>;
}
