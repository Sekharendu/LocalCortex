// Mirrors the API's shapes (src/conversationStore.ts, src/types.ts on the server).

export interface Citation {
  source: string;
  page?: number;
}

export type MessageRole = "user" | "assistant";
/** null = complete */
export type MessageStatus = "interrupted" | "error" | null;

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  citations: Citation[] | null;
  status: MessageStatus;
  /** Answer model key for assistant messages; null for questions and older answers. */
  model: string | null;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  spaceId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation extends ConversationSummary {
  messages: Message[];
}

export interface Health {
  ollama: boolean;
  qdrant: boolean;
  postgres: boolean;
}

export interface DocumentRecord {
  id: string;
  source: string;
  ingestedAt: string;
  chunkCount: number;
  collection?: string;
  spaceId?: string;
}

/** A Space holds files and chats; its chats only search its own files. */
export interface Space {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  chatCount: number;
  documentCount: number;
}

export interface AnswerModel {
  key: string;
  label: string;
  description: string;
}

/** What the loader can read (src/ingest/loader.ts SUPPORTED_EXTENSIONS). */
export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".pdf", ".docx"];
