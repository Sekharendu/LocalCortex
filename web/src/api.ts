import type { Citation, Conversation, ConversationSummary, DocumentRecord, Health } from "./types";

const BASE = "/api";

/** A non-2xx response. `message` is the server's `{ error }` text when it sent one. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function errorFrom(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body.error === "string") return new ApiError(res.status, body.error);
  } catch {
    // Not JSON. Every API error is JSON, so a bare 5xx comes from the Vite proxy
    // failing to reach the API at all.
    if (res.status >= 500) return new ApiError(res.status, "Can't reach the API. Is `pnpm dev` running?");
  }
  return new ApiError(res.status, `${res.status} ${res.statusText}`);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init.headers } : init?.headers,
  });
  if (!res.ok) throw await errorFrom(res);
  return (await res.json()) as T;
}

export async function getHealth(): Promise<Health> {
  return request<Health>("/health");
}

export async function listConversations(): Promise<ConversationSummary[]> {
  return (await request<{ conversations: ConversationSummary[] }>("/conversations")).conversations;
}

export async function createConversation(): Promise<Conversation> {
  const { conversation } = await request<{ conversation: ConversationSummary }>("/conversations", {
    method: "POST",
    body: "{}",
  });
  return { ...conversation, messages: [] };
}

export async function getConversation(id: string): Promise<Conversation> {
  return (await request<{ conversation: Conversation }>(`/conversations/${encodeURIComponent(id)}`)).conversation;
}

export async function renameConversation(id: string, title: string): Promise<ConversationSummary> {
  return (
    await request<{ conversation: ConversationSummary }>(`/conversations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    })
  ).conversation;
}

export async function deleteConversation(id: string): Promise<void> {
  await request(`/conversations/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export interface MessageStream {
  citations: Citation[];
  tokens: AsyncIterable<string>;
}

/**
 * Sends a message and resolves once the answer starts streaming. Failures before the
 * stream starts (400/404/503) reject with an ApiError; aborting `signal` stops the
 * answer server-side too (the server cancels generation when the connection drops).
 */
export async function sendMessage(id: string, content: string, signal: AbortSignal): Promise<MessageStream> {
  const res = await fetch(`${BASE}/conversations/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content }),
    signal,
  });
  if (!res.ok) throw await errorFrom(res);
  if (!res.body) throw new ApiError(res.status, "The response had no body to stream.");

  let citations: Citation[] = [];
  try {
    citations = JSON.parse(res.headers.get("x-citations") ?? "[]") as Citation[];
  } catch {
    // a malformed header shouldn't lose the answer
  }

  const body = res.body;
  async function* tokens() {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        if (text) yield text;
      }
      const rest = decoder.decode();
      if (rest) yield rest;
    } finally {
      reader.releaseLock();
    }
  }
  return { citations, tokens: tokens() };
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  return (await request<{ documents: DocumentRecord[] }>("/documents")).documents;
}

/** Uploads and indexes one file. Resolves when indexing is done, which can take a while. */
export async function uploadDocument(file: File): Promise<{ documentId: string; chunkCount: number }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/ingest`, { method: "POST", body: form });
  if (!res.ok) throw await errorFrom(res);
  return (await res.json()) as { documentId: string; chunkCount: number };
}

export async function deleteDocument(id: string): Promise<void> {
  await request(`/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
}
