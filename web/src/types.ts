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
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
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
